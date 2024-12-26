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

interface ActionTypeResponse {
  action_type: "send" | "save";
}

function ChatPage({
  currentNetwork,
  onNetworkUpdate,
}: {
  currentNetwork: Network | null;
  onNetworkUpdate: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");

  const determineActionType = async (
    text: string
  ): Promise<"send" | "save"> => {
    try {
      const response = await api.post<ActionTypeResponse>(
        "/api/v1/determine_action",
        {
          text: text,
        }
      );
      return response.data.action_type;
    } catch (error) {
      console.error("Error determining action type:", error);
      return "send"; // Default to send (ask) on error
    }
  };

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
        nid: currentNetwork?.nid || null,
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
        nid: currentNetwork?.nid || null,
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
    if (!input.trim()) return;

    const actionType = await determineActionType(input);
    if (actionType === "send") {
      await sendMessage();
    } else {
      await saveText();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInput(newValue);
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
          onChange={handleInputChange}
          placeholder={
            currentNetwork?.name
              ? `Type about ${currentNetwork?.name}...`
              : "Type about someone..."
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
          Send
        </Button>
      </Box>
    </Paper>
  );
}

export default ChatPage;
