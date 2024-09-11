import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
    const [username, setUsername] = useState("");
    const navigate = useNavigate();

    const handleLogin = () => {
        if (username.trim()) {
            localStorage.setItem("username", username);
            navigate("/");
        } else {
            alert("Please enter a username.");
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-8">Login</h1>
            <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
                <input
                    type="text"
                    placeholder="Enter Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="border-2 border-gray-300 bg-white h-10 px-5 rounded-lg text-sm focus:outline-none w-full mb-4"
                />
                <button
                    onClick={handleLogin}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
                >
                    Login
                </button>
            </div>
        </div>
    );
};

export default Login;
