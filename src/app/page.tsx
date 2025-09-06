
"use client";

import * as React from "react";
import DashboardPage from "./(protected)/page";
import ProtectedLayout from "./(protected)/layout";


export default function HomePage() {
    return (
        <ProtectedLayout>
            <DashboardPage />
        </ProtectedLayout>
    );
}
