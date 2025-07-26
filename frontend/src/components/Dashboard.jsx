import { useState, useEffect } from 'react';
import { getSignals } from '../apiService';

function Dashboard() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const response = await getSignals();
        // Transform the response object into an array for easy mapping
        const signalsArray = Object.entries(response.data).map(([symbol, signal]) => ({
          symbol,
          signal,
        }));
        setSignals(signalsArray);
      } catch (error) {
        console.error('Error fetching signals:', error);
      } finally {
        // Set loading to false only after the first fetch
        if (loading) {
            setLoading(false);
        }
      }
    };

    fetchSignals(); // Initial fetch
    const interval = setInterval(fetchSignals, 15000); // Refresh every 15 seconds

    return () => clearInterval(interval); // Cleanup on component unmount
  }, [loading]); // Rerun effect if loading changes (for initial setup)

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
        Real-Time Crypto Signals 📊
      </h1>
      {loading ? (
        <p className="text-center text-gray-600">Loading signals...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Symbol</th>
                <th className="py-3 px-6 text-left">Signal</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {signals.map(({ symbol, signal }, index) => (
                <tr
                  key={symbol}
                  className={`border-b border-gray-200 hover:bg-gray-100 ${
                    index % 2 === 0 ? 'bg-gray-50' : ''
                  }`}
                >
                  <td className="py-3 px-6 text-left whitespace-nowrap font-medium">{symbol}</td>
                  <td className="py-3 px-6 text-left">
                    <span
                      className={`py-1 px-3 rounded-full text-xs font-semibold ${
                        signal.includes('BUY')
                          ? 'bg-green-200 text-green-800'
                          : signal.includes('SELL')
                          ? 'bg-red-200 text-red-800'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {signal}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Dashboard;