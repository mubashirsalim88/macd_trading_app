import { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Replace with your actual public IP
  const API_URL = 'http://34.83.108.47:5000/api/signals';

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        setLoading(true);
        const response = await axios.get(API_URL);
        const signalsArray = Object.entries(response.data).map(([symbol, signal]) => ({
          symbol,
          signal,
        }));
        setSignals(signalsArray);
      } catch (error) {
        console.error('Error fetching signals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
    const interval = setInterval(fetchSignals, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
        Real-Time Crypto Signals
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
                  <td className="py-3 px-6 text-left whitespace-nowrap">{symbol}</td>
                  <td className="py-3 px-6 text-left">
                    <span
                      className={`py-1 px-3 rounded-full text-xs ${
                        signal === 'L33BC(BUY)'
                          ? 'bg-green-200 text-green-800'
                          : signal === 'NO_SIGNAL'
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-red-200 text-red-800'
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