import { createBrowserRouter } from "react-router-dom";
import PokemonGuessingGame from "./PokemonGuessingGame";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PokemonGuessingGame />,
  },
]);
