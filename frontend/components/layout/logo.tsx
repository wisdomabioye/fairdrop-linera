import Image from "next/image"
import Link from "next/link"
import { APP_INFO } from "@/config/app.config"
import { APP_ROUTES } from "@/config/app.route"

export function AppLogo() {

    return (
        <Link
            href={APP_ROUTES.home}
            className="flex items-center gap-3 group transition-transform hover:scale-105"
        >
        <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all">
            <Image
                src={APP_INFO.logo.fairdropMono}
                alt=''
                width={200}
                height={200}
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent opacity-0 group-hover:opacity-30 blur-xl transition-opacity" />
        </div>
        <div className="hidden sm:block">
            <div className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            {APP_INFO.name}
            </div>
            <div className="text-xs text-text-secondary -mt-1">
            {APP_INFO.tagline}
            </div>
        </div>
        </Link>

    )
}