import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const socket = io("https://f065-177-72-141-202.ngrok-free.app", {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default function Host() {
  const [roomId, setRoomId] = useState(null);
  const [controlAllowed, setControlAllowed] = useState(true);

  const [hasScreenSharing, setHasScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const userVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const peerConnection = useRef(null);

  const [inputValue, setInputValue] = useState("");

  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageSharing, setIsImageSharing] = useState(false);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result); // Base64
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleImageSharing = () => {
    if (isImageSharing) {
      socket.emit("stopImageShare", { roomId });
      setIsImageSharing(false);
    } else if (selectedImage) {
      socket.emit("shareImage", { roomId, imageData: selectedImage });
      setIsImageSharing(true);
    }
  };

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
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleNewICECandidate);

    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleNewICECandidate);
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current && screenStream) {
      localVideoRef.current.srcObject = screenStream;
    }
  }, [localVideoRef, screenStream]);

  const startScreenSharing = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      // Armazena a stream no estado
      setScreenStream(stream);
      // Atualiza o estado para renderizar o componente de vídeo
      setHasScreenSharing(true);

      if (!peerConnection.current) {
        peerConnection.current = createPeerConnection();
      }
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });
      createOffer();
    } catch (err) {
      console.error("Error starting screen sharing:", err);
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", event.candidate);
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        userVideoRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  };

  const createOffer = async () => {
    try {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit("offer", offer);
    } catch (err) {
      console.error("Error creating offer:", err);
    }
  };

  const handleOffer = async (offer) => {
    try {
      if (!peerConnection.current) {
        peerConnection.current = createPeerConnection();
      }
      await peerConnection.current.setRemoteDescription(offer);
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("answer", answer);
    } catch (err) {
      console.error("Error handling offer:", err);
    }
  };

  const handleAnswer = (answer) => {
    peerConnection.current.setRemoteDescription(answer);
  };

  const handleNewICECandidate = (candidate) => {
    if (peerConnection.current) {
      peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
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
      {!hasScreenSharing ? (
        <button onClick={startScreenSharing}>Start Screen Sharing</button>
      ) : (
        // Agora o componente de vídeo sempre estará renderizado quando hasScreenSharing for true
        <video
          ref={localVideoRef}
          autoPlay
          muted
          style={{ width: "500px" }}
        ></video>
      )}

      <div style={{ marginTop: 20 }}>
        <h3>Compartilhar Imagem</h3>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          style={{ marginBottom: "10px" }}
        />
        {selectedImage && (
          <div style={{ marginBottom: "10px" }}>
            <img
              src={selectedImage}
              alt="Miniatura"
              style={{ width: "150px", border: "1px solid #ccc" }}
            />
          </div>
        )}
        <button onClick={toggleImageSharing} disabled={!selectedImage}>
          {isImageSharing
            ? "Parar de Compartilhar Imagem"
            : "Compartilhar Imagem"}
        </button>
      </div>
    </div>
  );
}
