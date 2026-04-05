import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "@/shared/api/auth";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import axios, { AxiosError } from "axios";
import "./SignUpPage.css"

const SignUpPage = () => {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [repeat, setRepeat] = useState("");
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const isValid =
        fullName.trim() !== "" &&
        email.trim() !== "" &&
        password.trim() !== "" &&
        repeat.trim() !== "";

    const validate = (): string => {
        if (!email.includes("@")) return "Некорректный email";
        if (password.length < 8) return "Пароль должен быть не менее 8 символов";
        if (password !== repeat) return "Пароли не совпадают";
        return "";
    };

    const handleSignup = async () => {
        if (!isValid) return;

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            await authApi.signup(fullName, email, password);

            navigate("/", { replace: true });
        } catch (err: unknown) {
            let message = "";

            if (axios.isAxiosError(err)) {
                const axiosError = err as AxiosError<{ message?: string }>;
                if (axiosError.response?.status === 400) {
                    message = "Пользователь уже существует или данные некорректны";
                } else {
                    message = "Ошибка сервера";
                }
            }

            setError(message);
        }
    };

    const handleChange =
        (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
            setter(e.target.value);
            setError("");
        };

    return (
        <div className="auth-container">
            <h1>Регистрация</h1>

            <Input placeholder="ФИО" value={fullName} onChange={handleChange(setFullName)} />
            <Input placeholder="Email" value={email} onChange={handleChange(setEmail)} />
            <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={handleChange(setPassword)}
            />
            <Input
                type="password"
                placeholder="Повтор пароля"
                value={repeat}
                onChange={handleChange(setRepeat)}
            />

            {error && <div className="error">{error}</div>}

            <Button disabled={!isValid} onClick={handleSignup}>
                Зарегистрироваться
            </Button>

            <p>
                Уже есть аккаунт? <Link to="/login">Войти</Link>
            </p>
        </div>
    );
};

export default SignUpPage;