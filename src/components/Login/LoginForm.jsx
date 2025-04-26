import { Box, Button, TextField } from "@mui/material";
import { Form, FormikProvider, useFormik } from "formik";
import { z } from "zod";
import { toFormikValidationSchema } from "zod-formik-adapter";
import useAuth from "../../hooks/api/useAuth";

const schema = z.object({
  email: z
    .string({ required_error: "Campo obrigatório" })
    .email("Email inválido"),
  password: z.string({ required_error: "Campo obrigatório" }),
});

const LoginForm = () => {
  const { handleLogin } = useAuth();

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: toFormikValidationSchema(schema),
    onSubmit: async (values) => {
      await handleLogin({ email: values?.email, password: values?.password });
    },
  });

  const { handleSubmit, isSubmitting, isValid, getFieldProps } = formik;

  return (
    <FormikProvider value={formik}>
      <Form onSubmit={handleSubmit} style={{ width: "100%", height: "100%" }}>
        <Box
          sx={{
            height: "100%",
            width: "100%",
            backgroundColor: "#e2e2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              height: "100%",
              width: "50%",
              flexDirection: "column",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "2rem",
            }}
          >
            <TextField
              fullWidth
              label="Email"
              placeholder="Email"
              type="text"
              name="email"
              {...getFieldProps("email")}
            />

            <TextField
              fullWidth
              label="Senha"
              placeholder="Senha"
              type="text"
              name="password"
              {...getFieldProps("password")}
            />

            <Button
              type="submit"
              sx={{
                borderRadius: "5px",
                fontSize: "12px",
                fontWeight: 400,
                width: "100%",
              }}
              variant="contained"
            >
              {isSubmitting
                ? "Carregando..."
                : !isValid
                ? "Nao Valido"
                : "Entrar"}
            </Button>
          </Box>
        </Box>
      </Form>
    </FormikProvider>
  );
};

export default LoginForm;
