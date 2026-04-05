import {BrowserRouter, Routes, Route} from "react-router-dom";
import LoginPage from "@/pages/LoginPage/LoginPage";
import SignUpPage from "@/pages/SignUpPage/SignUpPage";
import HomePage from "@/pages/HomePage/HomePage.tsx";

export const AppRouter = () => (
    <BrowserRouter>
        <Routes>
            <Route path="/login" element={<LoginPage/>}/>
            <Route path="/signup" element={<SignUpPage/>}/>
            <Route
                path="/profile"
                element={
                    <div>Страница профиля (заглушка)</div>
                }
            />
            <Route path="/" element={<HomePage/>}/>
        </Routes>
    </BrowserRouter>
);