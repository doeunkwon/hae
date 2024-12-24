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
import api from "../utils/api";
import "../styles/Chat.css";
import { Message, Network } from "../types/api";

interface QueryResponse {
  answer: string;
  message: string;
  date: string;
}

interface SaveResponse {
  message: string;
}

function ChatPage({
  currentNetwork,
  onNetworkUpdate,
  actionType,
}: {
  currentNetwork: Network | null;
  onNetworkUpdate: () => void;
  actionType: "send" | "save";
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");

  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: input },
    ];

    setMessages(newMessages);
    setInput("");

    try {
      const response = await api.post<QueryResponse>("/api/v1/query", {
        query: input,
        name: currentNetwork?.name || "",
        nid: currentNetwork?.nid || 0,
        messages: messages,
      });

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
      const response = await api.post<SaveResponse>("/api/v1/save", {
        nid: currentNetwork?.nid || 0,
        text: input,
      });
      setInput("");
      alert(response.data.message);
      onNetworkUpdate();
    } catch (error: any) {
      console.error("Error saving text:", error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        alert(
          `Error saving information: ${
            error.response.data.detail || "Unknown error"
          }`
        );
      } else if (error.request) {
        console.error("No response received:", error.request);
        alert("No response received from server");
      } else {
        console.error("Error setting up request:", error.message);
        alert(`Error: ${error.message}`);
      }
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

      <Box display={"flex"} flexDirection={"row"} gap={1}>
        <TextField
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            actionType === "send"
              ? currentNetwork?.name
                ? `Ask a question about ${currentNetwork?.name}`
                : "Ask a question"
              : currentNetwork?.name
              ? `Save new information about ${currentNetwork?.name}`
              : "Save new information"
          }
          onKeyDown={handleKeyPress}
          multiline={true}
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

export default ChatPage;
