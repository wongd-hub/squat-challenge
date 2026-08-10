"use client";

import React from "react";
import Link from "next/link";
import TextLoop from "./TextLoop";

const FooterFloat: React.FC = () => {
  return (
    <footer className="py-24 text-center">
      <Link
        href="https://www.herdmentality.xyz/"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-muted-foreground hover:opacity-70 transition-opacity"
      >
        <TextLoop
          text="made by the herd"
          separator="✦"
          shape="wave"
          curviness={50}
          ribbon
          ribbonColor="#d97757"
          color="currentColor"
          fontSize={28}
          fontWeight={600}
          letterSpacing={1}
          uppercase={false}
          speed={30}
          pauseOnHover={false}
        />
      </Link>
    </footer>
  );
};

export default FooterFloat;
