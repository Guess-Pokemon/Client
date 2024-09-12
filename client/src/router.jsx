import { createBrowserRouter, redirect } from "react-router-dom";
import PokemonGuessingGame from "./pages/PokemonGuessingGame";
import Login from "./pages/Login";
import RootLayout from "./layouts/RootLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    loader: () => {
      const username = localStorage.getItem("username");
      if (username) {
        throw redirect("/");
      }
      return null;
    },
    children: [
      {
        path: "/login",
        element: <Login />,
      },
    ],
  },
  {
    path: "/",
    element: <RootLayout />,
    loader: () => {
      const username = localStorage.getItem("username");
      if (username) {
        return null;
      }
      throw redirect("/login");
    },
    children: [
      {
        path: "/",
        index: true,
        element: <PokemonGuessingGame />,
      },
    ],
  },
]);
