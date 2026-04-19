import {BrowserRouter, Routes, Route} from "react-router-dom";
import LoginPage from "@/pages/LoginPage/LoginPage";
import SignUpPage from "@/pages/SignUpPage/SignUpPage";
import HomePage from "@/pages/HomePage/HomePage.tsx";
import CreateCoursePage from "@/pages/CreateCoursePage/CreateCoursePage.tsx";
import CoursePage from "@/pages/CoursePage/CoursePage.tsx";
import Layout from "@/components/Layout/Layout.tsx";

export const AppRouter = () => (
    <BrowserRouter>
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/profile" element={<div>Страница профиля (заглушка)</div>} />
                <Route path="/courses/create" element={<CreateCoursePage />} />
                <Route path="/courses/:id" element={<CoursePage />} />
            </Route>
        </Routes>
    </BrowserRouter>
);