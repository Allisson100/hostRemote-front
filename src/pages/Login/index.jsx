import { Box } from "@mui/material";
import LoginForm from "../../components/Login/LoginForm";

const Login = () => {
  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LoginForm />
    </Box>
  );
};

export default Login;
