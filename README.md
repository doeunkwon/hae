# 🌞 Hae: Your Chat-based Personal CRM.

Welcome to **Hae**, the personal CRM app that transforms managing your network into a simple chat experience. Gone are the days of boring spreadsheets and complex interfaces. With Hae, you just chat with an AI assistant powered by **Gemini 1.5 Flash** to save and retrieve information about anyone in your network. 🌟

## 🎥 Demo

https://github.com/user-attachments/assets/d6ebed48-2862-444c-8116-99fe02775b01

## 🔍 RAG Technology with ChromaDB

Hae leverages **Retrieval-Augmented Generation (RAG)** technology using **ChromaDB** to supercharge your network management. Here's how it works:

- **✨ Vector Embeddings**: All your network content is transformed into vectors and stored in a vector store, ensuring lightning-fast and precise information retrieval.

- **🧠 Semantic Search**: Ask anything! Hae uses semantic search to find the top 3 most relevant answers to your natural language queries, based on your saved network content.

- **🔒 End-to-End Encryption**: Your privacy is our priority. Our database never stores your raw texts. All data is encrypted end-to-end, creating a fortress for your network information.

This technology empowers Hae to deliver quick and relevant responses to your queries, making network management a breeze and ensuring your data is safe and sound. 🛡️

## 🛠️ Tech Stack

- **Frontend**: React
- **Backend**: Python, FastAPI
- **Database**: SQLite, ChromaDB
- **Authentication**: Firebase Auth
- **Other Tools**: SQLAlchemy, LangChain

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- Python 3.x (less than 3.13)
- Firebase account

### Setup Instructions

1. **Clone the Repository**

   ```bash
   git clone https://github.com/doeunkwon/hae.git
   cd hae
   ```

2. **Setup Environment Variables**

   - **Server Side**: Create a `.env` file in the `server` directory based on `server/.env.example`.
   - **Client Side**: Create a `.env` file in the `client` directory based on `client/.env.example`.

3. **Setup Firebase**

   - **Create a Firebase Project**: Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.

   - **Add a Web App**: In your Firebase project, add a new web app to get your Firebase configuration keys.

   - **Generate Service Account Key**:

     - Navigate to the "Project Settings" in the Firebase Console.
     - Go to the "Service accounts" tab.
     - Click "Generate new private key" and download the JSON file.
     - Copy the contents of this JSON file into the `FIREBASE_SERVICE_ACCOUNT_KEY` in your server's `.env` file.

   - **Update Client Environment Variables**: Use the Firebase configuration keys from the web app setup to fill in the client `.env` file.

4. **Install Dependencies**

   - **Server**: Navigate to the `server` directory and install Python dependencies.

     ```bash
     cd server
     pip install -r requirements.txt
     ```

   - **Client**: Navigate to the `client` directory and install npm dependencies.

     ```bash
     cd client
     npm install
     ```

5. **Run the Application**

   - **Server**: Start the FastAPI server.

     ```bash
     python3 -m uvicorn main:app --reload
     ```

   - **Client**: Start the React app.

     ```bash
     npm start
     ```

6. **Enjoy Hae!**

   Open your browser and navigate to `http://localhost:3000` to start chatting with Hae and managing your network effortlessly. 🎉

## 🤝 Open Source Contributions

We welcome contributions from the open source community! Feel free to fork the repository, make improvements, and submit a pull request. We appreciate your help in making Hae better. 🙌

## 📜 License

This project is licensed under the MIT License. See the LICENSE file for more details.
