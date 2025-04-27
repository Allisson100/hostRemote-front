import CryptoJS from "crypto-js";

const handleHashRoom = (obj) => {
  const objectString = JSON.stringify(obj);

  const encrypted = CryptoJS.AES.encrypt(
    objectString,
    import.meta.env.VITE_SECRET_KEY
  ).toString();

  return encrypted;
};

export { handleHashRoom };
