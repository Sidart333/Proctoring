import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import UserEntryForm from "./pages/candidateflow/UserEntryForm";
import HeadCalibrationPage from "./pages/candidateflow/HeadCalibration";
import TestInterface from "./pages/candidateflow/testInterface";


const Router = () => (
    <BrowserRouter>
        <Routes>
            <Route path="/test/:token" element={<UserEntryForm />}/>
            <Route path="/test/:token/calibration" element={<HeadCalibrationPage />}/>
            <Route path="/test/:token/interview" element={<TestInterface />}/>
        </Routes>
    </BrowserRouter>
)

export default Router;