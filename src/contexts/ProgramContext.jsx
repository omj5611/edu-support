import { createContext, useContext, useState } from 'react'

const ProgramContext = createContext(null)

export function ProgramProvider({ children }) {
    const [selectedProgram, setSelectedProgram] = useState(null)
    return (
        <ProgramContext.Provider value={{ selectedProgram, setSelectedProgram }}>
            {children}
        </ProgramContext.Provider>
    )
}

export const useProgram = () => {
    const ctx = useContext(ProgramContext)
    if (!ctx) throw new Error('useProgram must be used within ProgramProvider')
    return ctx
}