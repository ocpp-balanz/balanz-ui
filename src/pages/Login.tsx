import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import balanz from '../images/balanz.png';
import { Dispatch, SetStateAction } from "react";

interface LoginProp {
    setToken: Dispatch<SetStateAction<string>>;
    showLoginFailure: boolean;
}

const Login: React.FC<LoginProp> = ({ setToken, showLoginFailure }) => {
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const username = data.get("username")?.toString() ?? "";
        const password = data.get("password")?.toString() ?? "";
        const token = username + password;
        setToken(token);
    };

    return (
    <Container component="main" maxWidth="xs">
        <Box
        sx={{  
            marginTop: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
        }}
        >
        <img src={balanz}/>
        <Typography component="h1" variant="h5" sx={{mt: 6}}>
            Sign in
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="User Name"
            name="username"
            autoComplete="username"
            autoFocus
            />
            <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
            />
            {showLoginFailure && (<Typography color="error">Login Failed</Typography>)}
            <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                color="success"
            >
                Sign In
            </Button>
        </Box>
        </Box>
    </Container>
    );
}

export default Login;
