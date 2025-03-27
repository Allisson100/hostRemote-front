import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

const socket = io("https://42f2-177-72-141-5.ngrok-free.app", {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default function Host() {
  const [roomId, setRoomId] = useState(null);
  const [controlAllowed, setControlAllowed] = useState(true);
  const videoRef = useRef(null);

  const generateRoom = () => {
    const newRoomId = uuidv4().slice(0, 12);
    setRoomId(newRoomId);
    socket.emit("createRoom", newRoomId);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "p") {
        setControlAllowed(false);
        socket.emit("toggleControl", { roomId, allowed: false });
      } else if (event.key === "c") {
        setControlAllowed(true);
        socket.emit("toggleControl", { roomId, allowed: true });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [roomId]);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      videoRef.current.srcObject = stream;

      // Enviando cada track do stream para os clientes via Socket.io
      stream.getTracks().forEach((track) => {
        socket.emit("startScreenShare", { roomId, track: track });
      });

      // Evento para parar a transmissão ao desligar a tela
      stream.getVideoTracks()[0].onended = () => {
        socket.emit("stopScreenShare", { roomId });
      };
    } catch (error) {
      console.error("Erro ao compartilhar tela:", error);
    }
  };

  return (
    <div>
      <h1>Host</h1>
      <button onClick={generateRoom}>Gerar Link</button>
      <button onClick={startScreenShare}>Compartilhar Tela</button>

      {roomId && (
        <p>
          Envie este link para o cliente:
          <p>{`https://client-remote-front.vercel.app/#/client/${roomId}`}</p>
        </p>
      )}

      <p>Controle do mouse: {controlAllowed ? "ATIVADO" : "BLOQUEADO"}</p>
      <video
        ref={videoRef}
        autoPlay
        style={{ width: "500px", border: "1px solid black" }}
      ></video>
    </div>
  );
}
