// sessionStorage key marking that this session has seen the boot loader.
// Plain (non-"use client") module so the root layout's inline script and
// the client <BootLoader/> can both import the real string.
export const BOOT_SEEN_KEY = "nyz-boot-seen";
