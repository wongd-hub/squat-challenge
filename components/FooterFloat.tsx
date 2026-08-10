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
        className="inline-block w-full max-w-2xl mx-auto text-muted-foreground hover:opacity-70 transition-opacity"
      >
        <TextLoop
          text="made by the herd"
          separator="✦"
          shape="wave"
          ribbon={false}
          color="currentColor"
          fontSize={28}
          fontWeight={600}
          letterSpacing={1}
          uppercase={false}
          speed={40}
        />
      </Link>
    </footer>
  );
};

export default FooterFloat;
