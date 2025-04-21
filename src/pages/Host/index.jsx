import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const socket = io("https://6cb1-177-72-141-202.ngrok-free.app", {
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

  const inputRef = useRef(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageSharing, setIsImageSharing] = useState(false);

  const [clientConnected, setClientConnected] = useState(false);

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
    stopScreenSharing();
    if (isImageSharing) {
      socket.emit("stopImageShare", { roomId });
      setIsImageSharing(false);
    } else if (selectedImage) {
      socket.emit("shareImage", { roomId, imageData: selectedImage });
      setIsImageSharing(true);
    }
  };

  const generateRoom = () => {
    setClientConnected(false);
    const newRoomId = uuidv4().slice(0, 12);
    setRoomId(newRoomId);
    socket.emit("createRoom", newRoomId);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "p") {
        setControlAllowed(false);
        socket.emit("toggleControl", { roomId, allowed: false });
      } else if (
        event.ctrlKey &&
        event.altKey &&
        event.key.toLowerCase() === "s"
      ) {
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
    socket.on("clientConnected", () => {
      setClientConnected(true);
    });

    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleNewICECandidate);
      socket.off("clientConnected");
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current && screenStream) {
      localVideoRef.current.srcObject = screenStream;
    }
  }, [localVideoRef, screenStream]);

  const startScreenSharing = async () => {
    if (isImageSharing) {
      toggleImageSharing();
    }

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

  const stopScreenSharing = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      setHasScreenSharing(false);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      socket.emit("stopScreenSharing", { roomId });
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

  const triggerFileSelect = () => {
    if (isImageSharing) {
      toggleImageSharing();
    }
    inputRef.current.click();
  };

  return (
    <div
      style={{
        padding: "2rem",
        backgroundColor: "#f4f4f9",
        height: "100vh",
        width: "100%",
        display: "flex",
        gap: "2rem",
      }}
    >
      <div
        style={{
          width: "70%",
          backgroundColor: "#000000",
          height: "calc(100vh - 4rem)",
          borderRadius: "2rem",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {hasScreenSharing && (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            style={{
              width: "100%",
              height: "auto",
            }}
          ></video>
        )}
        {selectedImage && (
          <div style={{ marginBottom: "10px", textAlign: "center" }}>
            <img
              src={selectedImage}
              alt="Miniatura"
              style={{
                width: "100%",
                height: "auto",
              }}
            />
          </div>
        )}
        {!hasScreenSharing && !selectedImage && (
          <p style={{ fontSize: "2rem", color: "#ffffff" }}>
            Aguardando compartilhamento
          </p>
        )}
      </div>
      <div
        style={{
          display: "flex",
          height: "calc(100vh - 4rem)",
          width: "30%",
          backgroundColor: "#ffffff",
          borderRadius: "2rem",
          overflow: "hidden",
          boxShadow: "0 -20px 30px -10px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div
          style={{
            padding: "2rem",
            borderRadius: "8px",
            width: "100%",
            height: "100%",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {roomId && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <p
                style={{
                  fontSize: "1rem",
                  marginBottom: "1rem",
                }}
              >
                {clientConnected ? (
                  <span style={{ fontSize: "1rem", fontWeight: "bold" }}>
                    Cliente conectado
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "1rem",
                      fontWeight: "bold",
                      color: "#83222c",
                    }}
                  >
                    Aguardando cliente se conectar
                  </span>
                )}
              </p>
              {clientConnected && (
                <>
                  <p>
                    Acionar mouse:{" "}
                    <span style={{ fontWeight: "bold" }}>CRTL + ALT + s</span>
                  </p>
                  <p
                    style={{
                      marginBottom: "1rem",
                    }}
                  >
                    Desativar mouse:{" "}
                    <span style={{ fontWeight: "bold" }}>CRTL + ALT + p</span>
                  </p>
                </>
              )}

              <p
                style={{
                  fontSize: "1rem",
                  color: "#333",
                  marginBottom: "1rem",
                }}
              >
                Envie este link para o cliente:{" "}
                <span style={{ fontWeight: "bold" }}>
                  https://client-remote-front.vercel.app/#/client/{roomId}
                </span>
              </p>

              {clientConnected && (
                <p
                  style={{
                    fontSize: "1rem",
                    marginBottom: "4rem",
                    color: controlAllowed ? "green" : "red",
                  }}
                >
                  Controle do mouse: {controlAllowed ? "ATIVADO" : "BLOQUEADO"}
                </p>
              )}
            </div>
          )}
          <button
            onClick={generateRoom}
            style={{
              padding: "10px 20px",
              backgroundColor: "#031D44",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "100%",
              fontSize: "1rem",
              marginBottom: "0.5rem",
            }}
          >
            Gerar Link
          </button>

          {roomId &&
            clientConnected &&
            (!hasScreenSharing ? (
              <button
                onClick={startScreenSharing}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#70A288",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  width: "100%",
                  fontSize: "1rem",
                  marginBottom: "0.5rem",
                }}
              >
                Compartilhar vídeo
              </button>
            ) : (
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={stopScreenSharing}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#83222c",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    width: "100%",
                    marginBottom: "0.5rem",
                  }}
                >
                  Parar Compartilhamento
                </button>
              </div>
            ))}

          {selectedImage && (
            <button
              onClick={toggleImageSharing}
              disabled={!selectedImage}
              style={{
                padding: "10px 20px",
                backgroundColor: isImageSharing ? "#83222c" : "#DAB785",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
                width: "100%",
                marginBottom: "0.5rem",
              }}
            >
              {isImageSharing
                ? "Parar de Compartilhar Imagem"
                : "Compartilhar Imagem"}
            </button>
          )}

          {roomId && clientConnected && (
            <button
              onClick={triggerFileSelect}
              style={{
                padding: "10px 20px",
                backgroundColor: "#04395E",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
                width: "100%",
              }}
            >
              Escolher Imagem
            </button>
          )}

          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              ref={inputRef}
              style={{
                display: "none",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
