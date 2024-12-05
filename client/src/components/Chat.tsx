import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Container,
} from "@mui/material";
import axios from "axios";
import "../styles/Chat.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function Chat() {
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
        `${process.env.REACT_APP_API_URL}/chat`,
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
      await axios.post(`${process.env.REACT_APP_API_URL}/save`, {
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
    <Paper
      elevation={3}
      className="chat-paper"
      sx={{ bgcolor: "background.default" }}
    >
      <List className="message-list">
        {messages.map((message, index) => (
          <ListItem
            key={index}
            className={`message ${message.role}`}
            sx={{
              marginLeft: message.role === "user" ? "auto" : "0",
              marginRight: message.role === "user" ? "0" : "auto",
            }}
          >
            <ListItemText
              primary={message.role === "user" ? "You" : "Hae"}
              primaryTypographyProps={{
                sx: { color: "text.secondary" },
              }}
              secondary={message.content}
              secondaryTypographyProps={{
                sx: { color: "text.primary" },
              }}
            />
          </ListItem>
        ))}
      </List>

      <Box className="input-container">
        <TextField
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question"
          onKeyDown={handleKeyPress}
          variant="outlined"
        />
        <Button onClick={sendMessage} sx={{ textTransform: "none" }}>
          Send
        </Button>
      </Box>

      <Box className="save-container">
        <TextField
          fullWidth
          value={saveInput}
          onChange={(e) => setSaveInput(e.target.value)}
          placeholder="Save new information"
          multiline
          variant="outlined"
        />
        <Button onClick={saveText} sx={{ textTransform: "none" }}>
          Save
        </Button>
      </Box>
    </Paper>
  );
}

export default Chat;
