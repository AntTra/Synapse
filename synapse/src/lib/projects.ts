export const projects = [
  {
    slug: "busroutes",
    title: "Trondheim in motion",
    category: "Data & visualisation",
    image: "/busroutes.png",
    description:
      "A city-scale transit experiment. Explore bus positions and stop departures in a custom 3D map.",
    stack: "Next.js · Three.js · Entur",
    detail: "Live data depends on Entur availability.",
  },
  {
    slug: "globe",
    title: "A different perspective",
    category: "Interactive graphics",
    image: "/globe.png",
    description:
      "An interactive solar scene exploring planetary textures, shaders, and real-time rendering.",
    stack: "Three.js · WebGL · TypeScript",
    detail: "Interactive 3D experiment.",
  },
  {
    slug: "facemesh",
    title: "Seeing the structure",
    category: "Computer vision",
    image: "/facemesh.png",
    description:
      "Explore facial landmarks through a webcam-driven face mesh, rendered directly in the browser.",
    stack: "MediaPipe · Computer vision",
    detail: "Requires camera permission.",
  },
];
