import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const Login = () => {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (username.trim()) {
      localStorage.setItem("username", username);
      navigate("/");
    } else {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Please enter a username before join the game.",
      });
    }
  };

  return (
    <section className="bg-white dark:bg-gray-900 bg-[url('https://flowbite.s3.amazonaws.com/docs/jumbotron/hero-pattern.svg')] dark:bg-[url('https://flowbite.s3.amazonaws.com/docs/jumbotron/hero-pattern-dark.svg')]">
  <div className="py-8 px-4 mx-auto max-w-screen-xl text-center lg:py-16 z-10 relative">
    <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl dark:text-white">Login</h1>
    <form className="w-full max-w-md mx-auto">
      <label htmlFor="username" className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Username</label>
      <div className="relative mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 rtl:inset-x-0 start-0 flex items-center ps-3.5 pointer-events-none">
         <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.31 0-6 2.69-6 6v2h12v-2c0-3.31-2.69-6-6-6z"/>
            </svg>
          </div>
          <input
            type="text"
            id="username"
            placeholder="Enter Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            required
          />
        </div>
      </div>
      <button
        onClick={handleLogin}
        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 w-full"
      >
        Login
      </button>
    </form>
  </div>
  <div className="bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-900 w-full h-full absolute top-0 left-0 z-0"></div>
</section>

  
  );
};

export default Login;
