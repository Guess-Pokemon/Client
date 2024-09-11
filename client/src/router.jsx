import { createBrowserRouter } from "react-router-dom";
import PokemonGuessingGame from "./pages/PokemonGuessingGame";
import Login from "./pages/Login";
import RootLayout from "./layouts/RootLayout";


export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
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
    children: [
      {
        path: "/",
        index: true,
        element: <PokemonGuessingGame />,
      },
    ],
  }
]);
