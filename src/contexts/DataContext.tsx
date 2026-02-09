/**
 * React Context for DataLoader - supports dual raw/chat DNA databases
 */
import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from 'react';
import { DataLoader } from '@/utils/data';
import { Center, Stack, Loader, Text, Paper } from '@mantine/core';

// Types for dual data context
export type DnaMode = 'raw' | 'chat';

interface DualDataContextType {
    rawLoader: DataLoader;
    chatLoader: DataLoader;
    isReady: boolean;
    chatAvailable: boolean;
}

const DualDataContext = createContext<DualDataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
    const [rawLoader] = useState(() => new DataLoader('/dna_database.json'));
    const [chatLoader] = useState(() => new DataLoader('/dna_database_chat.json'));
    const [ready, setReady] = useState(false);
    const [chatAvailable, setChatAvailable] = useState(false);

    useEffect(() => {
        Promise.all([
            rawLoader.loadDatabase(),
            chatLoader.loadDatabase().catch(() => {
                console.log('Chat DNA database not available');
                return null;
            })
        ]).then(([, chatResult]) => {
            setChatAvailable(chatResult !== null && chatLoader.models.length > 0);
            setReady(true);
        });
    }, [rawLoader, chatLoader]);

    if (!ready) {
        return (
            <Center h="100vh" bg="gray.0">
                <Paper p="xl" radius="lg" shadow="lg" withBorder>
                    <Stack align="center" gap="md">
                        <Loader size="lg" color="violet" type="dots" />
                        <Text size="lg" fw={500} c="dimmed">
                            Loading DNA Database...
                        </Text>
                        <Text size="sm" c="dimmed">
                            Mapping the LLM genome
                        </Text>
                    </Stack>
                </Paper>
            </Center>
        );
    }

    return (
        <DualDataContext.Provider value={{ rawLoader, chatLoader, isReady: ready, chatAvailable }}>
            {children}
        </DualDataContext.Provider>
    );
}

/**
 * Hook to get the DataLoader for a specific mode (raw or chat)
 */
export function useData(mode: DnaMode = 'raw'): DataLoader {
    const ctx = useContext(DualDataContext);
    if (!ctx) {
        throw new Error('useData must be used within DataProvider');
    }
    return mode === 'chat' ? ctx.chatLoader : ctx.rawLoader;
}

/**
 * Hook to get both loaders and metadata
 */
export function useDualData(): DualDataContextType {
    const ctx = useContext(DualDataContext);
    if (!ctx) {
        throw new Error('useDualData must be used within DataProvider');
    }
    return ctx;
}
