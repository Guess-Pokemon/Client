import { createBrowserRouter } from "react-router-dom";
import PokemonGuessingGame from "./PokemonGuessingGame";
import RootLayout from "./layouts/RootLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        path: "/login",
        element: <h1>login page</h1>,
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
  },
]);
