import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const socket = io("https://a0e9-177-72-141-5.ngrok-free.app", {
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
  const iceCandidatesQueue = useRef([]);

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
      socket.off("answer");
      socket.off("candidate");
    };
  }, []);

  const startConnection = () => {
    peerConnection.current = new RTCPeerConnection();

    // Adiciona todas as tracks do stream à conexão
    localStream.current.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, localStream.current);
    });

    // Emite candidatos ICE
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", event.candidate);
      }
    };

    // Cria a oferta, define o local description e a envia
    peerConnection.current
      .createOffer()
      .then((offer) =>
        peerConnection.current.setLocalDescription(offer).then(() => offer)
      )
      .then((offer) => {
        socket.emit("offer", offer);
      })
      .catch((err) => console.error("Erro ao criar oferta:", err));

    // Ao receber a resposta (answer) do client
    socket.on("answer", (answer) => {
      if (!peerConnection.current.remoteDescription) {
        peerConnection.current
          .setRemoteDescription(answer)
          .then(() => {
            // Adiciona os ICE candidates pendentes
            iceCandidatesQueue.current.forEach((candidate) => {
              peerConnection.current
                .addIceCandidate(candidate)
                .catch((err) =>
                  console.error("Erro ao adicionar ICE candidate:", err)
                );
            });
            iceCandidatesQueue.current = [];
          })
          .catch((err) =>
            console.error("Erro ao setRemoteDescription com answer:", err)
          );
      }
    });

    // Trata os ICE candidates recebidos do client
    socket.on("candidate", (candidate) => {
      if (candidate) {
        if (!peerConnection.current.remoteDescription) {
          iceCandidatesQueue.current.push(candidate);
        } else {
          peerConnection.current
            .addIceCandidate(candidate)
            .catch((err) =>
              console.error("Erro ao adicionar ICE candidate:", err)
            );
        }
      }
    });
  };

  // Captura a tela para compartilhamento
  const handleShareScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      localStream.current = stream;
      videoRef.current.srcObject = stream;
      setIsSharing(true);
      startConnection();
    } catch (err) {
      console.error("Erro ao compartilhar tela:", err);
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
          {`Envie este link para o cliente: https://client-remote-front.vercel.app/#/client/${roomId}`}
        </p>
      )}
      <p>Controle do mouse: {controlAllowed ? "ATIVADO" : "BLOQUEADO"}</p>
      {!isSharing && <button onClick={handleShareScreen}>Share Screen</button>}
      <video ref={videoRef} autoPlay muted style={{ width: "300px" }} />
    </div>
  );
}
