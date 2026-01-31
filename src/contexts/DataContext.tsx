/**
 * React Context for DataLoader - replaces window.dataLoader
 */
import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from 'react';
import { DataLoader } from '@/js/data.js';
import { Center, Stack, Loader, Text, Paper } from '@mantine/core';

const DataContext = createContext<DataLoader | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
    const [loader] = useState(() => new DataLoader());
    const [ready, setReady] = useState(false);

    useEffect(() => {
        loader.loadDatabase().finally(() => setReady(true));
    }, [loader]);

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
        <DataContext.Provider value={loader}>
            {children}
        </DataContext.Provider>
    );
}

export function useData(): DataLoader {
    const ctx = useContext(DataContext);
    if (!ctx) {
        throw new Error('useData must be used within DataProvider');
    }
    return ctx;
}
