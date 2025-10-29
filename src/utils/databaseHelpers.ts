import { attemptPromise } from '@jfdi/attempt';

interface FetchAndSetOptions<T> {
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	setData: (data: T) => void;
}

export const fetchAndSet = async <T>(
	query: () => Promise<T>,
	options: FetchAndSetOptions<T>,
): Promise<void> => {
	const { setLoading, setError, setData } = options;

	setLoading(true);
	setError(null);

	const [error, data] = await attemptPromise(query);

	if (error) {
		setError(error.message);
		setLoading(false);
		return;
	}

	setData(data);
	setLoading(false);
};
