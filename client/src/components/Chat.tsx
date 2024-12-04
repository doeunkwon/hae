import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import axios from "axios";
import "../styles/Chat.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [saveInput, setSaveInput] = useState<string>("");

  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: input },
    ];

    setMessages(newMessages);
    setInput("");

    try {
      const response = await axios.post<{ response: string }>(
        "http://localhost:8000/chat",
        {
          messages: newMessages,
        }
      );

      setMessages([
        ...newMessages,
        { role: "assistant", content: response.data.response },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const saveText = async (): Promise<void> => {
    if (!saveInput.trim()) return;

    try {
      await axios.post("http://localhost:8000/save", {
        text: saveInput,
      });
      setSaveInput("");
      alert("Text saved successfully!");
    } catch (error) {
      console.error("Error saving text:", error);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <Box className="chat-container">
      <Paper elevation={3} className="chat-paper">
        <List className="message-list">
          {messages.map((message, index) => (
            <ListItem key={index} className={`message ${message.role}`}>
              <ListItemText
                primary={message.role === "user" ? "You" : "Assistant"}
                secondary={message.content}
              />
            </ListItem>
          ))}
        </List>

        <Box className="input-container">
          <TextField
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            onKeyPress={handleKeyPress}
          />
          <Button variant="contained" onClick={sendMessage}>
            Send
          </Button>
        </Box>

        <Box className="save-container">
          <TextField
            fullWidth
            value={saveInput}
            onChange={(e) => setSaveInput(e.target.value)}
            placeholder="Save new information..."
            multiline
            rows={3}
          />
          <Button variant="contained" onClick={saveText}>
            Save
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Chat;
