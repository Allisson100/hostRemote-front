import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const socket = io("https://09f1-177-72-141-5.ngrok-free.app", {
  transports: ["websocket", "polling"], // Garante compatibilidade
  reconnectionAttempts: 5, // Tenta reconectar até 5 vezes
  reconnectionDelay: 1000, // Espera 1 segundo entre tentativas
});

export default function Host() {
  const [roomId, setRoomId] = useState(null);
  const [controlAllowed, setControlAllowed] = useState(true);
  const videoRef = useRef(null);
  const localStream = useRef(null);
  const peerConnection = useRef(null);
  const [isSharing, setIsSharing] = useState(false);

  const [inputValue, setInputValue] = useState("");

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

  useEffect(() => {
    socket.emit("register", { role: "sender" });

    return () => {
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startConnection = () => {
    peerConnection.current = new RTCPeerConnection();

    localStream.current.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, localStream.current);
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", event.candidate);
      }
    };

    peerConnection.current.createOffer().then((offer) => {
      peerConnection.current.setLocalDescription(offer);
      socket.emit("offer", offer);
    });

    socket.on("answer", (answer) => {
      peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    });

    socket.on("candidate", (candidate) => {
      if (candidate) {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  };

  const handleShareScreen = async () => {
    try {
      // Prompt the user to select a screen/window
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      localStream.current = stream;
      videoRef.current.srcObject = stream;
      setIsSharing(true);
      startConnection();
    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  };

  return (
    <div>
      <h1>Host</h1>
      <input
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
      />
      <button onClick={generateRoom}>Gerar Link</button>
      {roomId && (
        <p>
          Envie este link para o cliente:
          <p>{`https://client-remote-front.vercel.app/#/client/${roomId}`}</p>
        </p>
      )}
      <p>Controle do mouse: {controlAllowed ? "ATIVADO" : "BLOQUEADO"}</p>
      {!isSharing && <button onClick={handleShareScreen}>Share Screen</button>}
      <video ref={videoRef} autoPlay muted style={{ width: "300px" }} />
    </div>
  );
}
