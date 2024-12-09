import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import axios from "axios";
import "../styles/Chat.css";
import { Message } from "../types/api";

function Chat({ currentName }: { currentName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey there 🌞",
    },
  ]);
  const [input, setInput] = useState<string>("");
  const [actionType, setActionType] = useState<"send" | "save">("send");

  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: input },
    ];

    setMessages(newMessages);
    setInput("");

    try {
      const response = await axios.post<{ message: string; answer: string }>(
        `${process.env.REACT_APP_API_URL}/query`,
        {
          query: input,
          name: currentName,
        }
      );

      setMessages([
        ...newMessages,
        { role: "assistant", content: response.data.answer },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const saveText = async (): Promise<void> => {
    if (!input.trim()) return;

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/save`, {
        text: input,
      });
      setInput("");
      alert("Text saved successfully!");
    } catch (error) {
      console.error("Error saving text:", error);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (actionType === "send") {
      await sendMessage();
    } else {
      await saveText();
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
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
        <FormControl sx={{ minWidth: 100 }}>
          <InputLabel>Action</InputLabel>
          <Select
            value={actionType}
            onChange={(e) => setActionType(e.target.value as "send" | "save")}
            label="Action"
          >
            <MenuItem value="send">Ask</MenuItem>
            <MenuItem value="save">Save</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            actionType === "send" ? "Ask a question" : "Save new information"
          }
          onKeyDown={handleKeyPress}
          multiline={actionType === "save"}
          variant="outlined"
        />
        <Button
          onClick={handleSubmit}
          sx={{
            textTransform: "none",
            alignSelf: "stretch",
          }}
        >
          {actionType === "send" ? "Ask" : "Save"}
        </Button>
      </Box>
    </Paper>
  );
}

export default Chat;
