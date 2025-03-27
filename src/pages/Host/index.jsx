import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const socket = io("https://1835-177-72-141-5.ngrok-free.app", {
  transports: ["websocket", "polling"], // Garante compatibilidade
  reconnectionAttempts: 5, // Tenta reconectar até 5 vezes
  reconnectionDelay: 1000, // Espera 1 segundo entre tentativas
});

export default function Host() {
  const [roomId, setRoomId] = useState(null);
  const [controlAllowed, setControlAllowed] = useState(true);
  const [stream, setStream] = useState(null);
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
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      setStream(screenStream);
      if (videoRef.current) {
        videoRef.current.srcObject = screenStream;
      }
      const [videoTrack] = screenStream.getVideoTracks();
      socket.emit("startScreenShare", { roomId });
      videoTrack.onended = () => {
        socket.emit("stopScreenShare", { roomId });
        setStream(null);
      };

      screenStream.getTracks().forEach((track) => {
        socket.emit("screenStream", { roomId, track });
      });
    } catch (error) {
      console.error("Erro ao compartilhar a tela", error);
    }
  };

  return (
    <div>
      <h1>Host</h1>
      <button onClick={generateRoom}>Gerar Link</button>
      {roomId && (
        <p>
          Envie este link para o cliente:
          <p>{`https://client-remote-front.vercel.app/#/client/${roomId}`}</p>
        </p>
      )}
      <p>Controle do mouse: {controlAllowed ? "ATIVADO" : "BLOQUEADO"}</p>
      <button onClick={startScreenShare}>Compartilhar Tela</button>
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          style={{ width: "300px", border: "1px solid black" }}
        />
      )}
    </div>
  );
}
