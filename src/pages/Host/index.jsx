import React, { useState, useEffect, useRef, useContext } from "react";
import { v4 as uuidv4 } from "uuid";
import { SocketContext } from "../../contexts/SocketContext";
import { handleHashRoom } from "../../utils/handleHashRoom";
import { AuthContext } from "../../contexts/AuthContext";
import { TextField } from "@mui/material";

export default function Host() {
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);

  // REF TAG VIDEO CLINETE E HOST
  const userVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  // CONEXÃO PARA O COMPARTILHAMENTO DE VIDEO
  const peerConnection = useRef(null);

  // INPUT IMAGEM
  const inputRef = useRef(null);

  // ID DA SALA
  const [roomId, setRoomId] = useState(null);
  const [hashRoom, setHashRoom] = useState("");
  const [inputValue, setInputValue] = useState("");

  // CONTROLE CLIENTE CONECTADO?
  const [clientConnected, setClientConnected] = useState(false);

  // CONTROLE DO MOUSE
  const [controlAllowed, setControlAllowed] = useState(true);

  // CONTROLE COMPARTILHMANETO DE TELA
  const [hasScreenSharing, setHasScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);

  // CONTROLE DA IMAGEM
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageSharing, setIsImageSharing] = useState(false);

  // CONTROLE PARAR COMPARTILHAMENTO DE VIDEO
  const [shouldStopSharing, setShouldStopSharing] = useState(false);

  const handelReset = () => {
    setRoomId(null);
    setHashRoom("");
    setInputValue("");
    setClientConnected(false);
    setControlAllowed(true);
    setHasScreenSharing(false);
    setScreenStream(null);
    setSelectedImage(null);
    setIsImageSharing(false);
    setShouldStopSharing(false);
  };

  // SELECIONA A IMAGEM
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

  // INICIA OU PARA O OMPARTILHAMENTO DA IMAGEM
  const toggleImageSharing = () => {
    stopScreenSharing();
    if (isImageSharing) {
      socket.emit("stopImageShare", { roomId });
      setIsImageSharing(false);
      setSelectedImage(null);
      inputRef.current.value = null;
    } else if (selectedImage) {
      socket.emit("shareImage", { roomId, imageData: selectedImage });
      setIsImageSharing(true);
      setControlAllowed(false);
      socket.emit("toggleControl", { roomId, allowed: false });
    }
  };

  // CRIA NOVA SALA NO SOCKET
  const generateRoom = () => {
    setClientConnected(false);
    const newRoomId = uuidv4().slice(0, 12);
    setRoomId(newRoomId);
    const hashRoom = handleHashRoom({
      connectionUrl: user?.connectionUrl,
      socketRoomId: newRoomId,
    });
    setHashRoom(hashRoom);
    stopScreenSharing();
    socket.emit("stopImageShare", { roomId });
    setIsImageSharing(false);
    setSelectedImage(null);
    setControlAllowed(true);
    inputRef.current.value = null;

    socket.emit("createRoom", newRoomId);
  };

  // COMEÇA STREAM DE VIDEO
  const startScreenSharing = async () => {
    if (isImageSharing) {
      toggleImageSharing();
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      setScreenStream(stream);
      setHasScreenSharing(true);

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        setShouldStopSharing(true);
      });

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

  // PARA STREAM DE VIDEO
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

  //  ### CONEXÃO HOST E CLIENT PARA STREM DO VIDEO ###
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
  //  ### CONEXÃO HOST E CLIENT PARA STREM DO VIDEO ###

  // ABRE O INPUT DE IMAGEM SEM CLICAR NO INPUT EM SI
  const triggerFileSelect = () => {
    if (isImageSharing) {
      toggleImageSharing();
    }
    inputRef.current.click();
  };

  // CONTROLE DO MOUSE NO CLIENT, ATIVAR OU DESATIVAR ELE PELO ATALHO NO TECLADO
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

    if (isImageSharing) {
      window.removeEventListener("keydown", handleKeyDown);
    } else {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [roomId, isImageSharing]);

  // ### CONEXÃO HOST E CLIENTE PARA STREM DO VIDEO ###
  useEffect(() => {
    if (!socket) return;

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleNewICECandidate);
    socket.on("clientConnected", () => {
      setClientConnected(true);
    });
    socket.on("reset", () => {
      handelReset();
    });

    socket.on("inputValueChange", (data) => {
      setInputValue(data?.value);
    });

    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleNewICECandidate);
      socket.off("clientConnected");
      socket.off("inputValueChange");
      socket.off("reset");
    };
  }, [socket]);

  // OBTEM VIDEO COMPARTILHADO LOCALMENTE
  useEffect(() => {
    if (localVideoRef.current && screenStream) {
      localVideoRef.current.srcObject = screenStream;
    }
  }, [localVideoRef, screenStream]);

  // PARA A STREAM DE VIDEO PELO POP-UP DO NAVEGADOR
  useEffect(() => {
    if (shouldStopSharing) {
      stopScreenSharing();
      setShouldStopSharing(false);
    }
  }, [shouldStopSharing]);

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
          height: "calc(100vh - 4rem)",
          backgroundColor: !selectedImage && "black",
          borderRadius: !selectedImage && "2rem",
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
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              width: "100%",
              height: "100%",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "40%",
              }}
            >
              <TextField
                placeholder="Aguarde o cliente digitar ..."
                disabled
                fullWidth
                multiline
                minRows={7}
                maxRows={7}
                value={inputValue}
              />
            </div>
            <div
              style={{
                textAlign: "center",
                width: "100%",
                height: "60%",
                backgroundColor: "#000000",
                borderRadius: "2rem",
              }}
            >
              <img
                src={selectedImage}
                alt="Miniatura"
                style={{
                  width: "auto",
                  height: "100%",
                }}
              />
            </div>
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
                <span
                  style={{
                    fontWeight: "bold",
                    wordBreak: "break-all",
                    whiteSpace: "normal",
                  }}
                >
                  {`${
                    import.meta.env.VITE_FRONT_DOIS
                  }/#/client/${encodeURIComponent(hashRoom)}`}
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
                Compartilhar Tela
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
