import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, DollarSign, GripVertical, Settings, BarChart3, Save, RefreshCw } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CashflowTracker = () => {
  const [months, setMonths] = useState([]);
  const [items, setItems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    amount: 0,
    type: 'expense', // 'income', 'expense', 'optional'
    frequency: 'once', // 'once', 'monthly', 'biweekly'
    monthId: ''
  });

  // Initialize months (next 12 months)
  useEffect(() => {
    const monthsArray = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      monthsArray.push({
        id: `month-${i}`,
        name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        date: date,
        items: []
      });
    }
    setMonths(monthsArray);
    setNewItem(prev => ({ ...prev, monthId: monthsArray[0]?.id || '' }));
    
    // Load saved data
    loadFromLocalStorage();
  }, []);

  // Load/Save to localStorage as backup
  const loadFromLocalStorage = () => {
    const savedItems = localStorage.getItem('cashflow-items');
    const savedUrl = localStorage.getItem('cashflow-sheets-url');
    if (savedItems) {
      setItems(JSON.parse(savedItems));
    }
    if (savedUrl) {
      setGoogleSheetsUrl(savedUrl);
    }
  };

  const saveToLocalStorage = () => {
    localStorage.setItem('cashflow-items', JSON.stringify(items));
    localStorage.setItem('cashflow-sheets-url', googleSheetsUrl);
  };

  // Google Sheets integration
  const convertSheetsUrl = (url) => {
    if (!url) return null;
    // Convert Google Sheets URL to CSV export URL
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }
    return null;
  };

  const saveToGoogleSheets = async () => {
    if (!googleSheetsUrl) {
      alert('Please add your Google Sheets URL first');
      return;
    }
    
    setIsLoading(true);
    try {
      // Create CSV data
      const csvData = items.map(item => ({
        id: item.id,
        name: item.name,
        amount: item.amount,
        type: item.type,
        frequency: item.frequency,
        monthId: item.monthId
      }));
      
      // Note: This is a simplified version. In reality, you'd need Google Sheets API
      // For now, we'll save to localStorage and show instructions
      saveToLocalStorage();
      alert('Data saved locally! To sync with Google Sheets, you\'ll need to manually copy the data or set up the Google Sheets API.');
      
    } catch (error) {
      console.error('Error saving to Google Sheets:', error);
      alert('Error saving to Google Sheets. Data saved locally as backup.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromGoogleSheets = async () => {
    if (!googleSheetsUrl) {
      alert('Please add your Google Sheets URL first');
      return;
    }
    
    setIsLoading(true);
    try {
      const csvUrl = convertSheetsUrl(googleSheetsUrl);
      if (!csvUrl) {
        throw new Error('Invalid Google Sheets URL');
      }
      
      // This would need to be implemented with proper CORS handling
      // For now, we'll load from localStorage
      loadFromLocalStorage();
      alert('Data loaded from local storage! Google Sheets integration requires additional setup.');
      
    } catch (error) {
      console.error('Error loading from Google Sheets:', error);
      alert('Error loading from Google Sheets. Loading local data instead.');
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate cumulative balances
  const calculateBalances = () => {
    let cumulative = 0;
    return months.map(month => {
      const monthItems = items.filter(item => item.monthId === month.id);
      const monthlyTotal = monthItems.reduce((sum, item) => {
        return sum + (item.type === 'income' ? item.amount : -item.amount);
      }, 0);
      cumulative += monthlyTotal;
      
      return {
        ...month,
        monthlyBalance: monthlyTotal,
        cumulativeBalance: cumulative,
        items: monthItems
      };
    });
  };

  const balancedMonths = calculateBalances();

  // Prepare chart data
  const prepareChartData = () => {
    return balancedMonths.map(month => {
      const data = {
        month: month.name,
        cumulative: month.cumulativeBalance
      };
      
      // Add each item type as a separate bar segment
      const incomeItems = month.items.filter(item => item.type === 'income');
      const expenseItems = month.items.filter(item => item.type === 'expense');
      const optionalItems = month.items.filter(item => item.type === 'optional');
      
      data.income = incomeItems.reduce((sum, item) => sum + item.amount, 0);
      data.expenses = -expenseItems.reduce((sum, item) => sum + item.amount, 0);
      data.optional = -optionalItems.reduce((sum, item) => sum + item.amount, 0);
      
      return data;
    });
  };

  const chartData = prepareChartData();

  // Find earliest month where item can be afforded
  const findEarliestAffordableMonth = (itemAmount) => {
    const balances = calculateBalances();
    for (let i = 0; i < balances.length; i++) {
      if (balances[i].cumulativeBalance >= itemAmount) {
        return balances[i].id;
      }
    }
    return balances[balances.length - 1]?.id;
  };

  // Add or update item
  const handleSaveItem = () => {
    if (editingItem) {
      setItems(items.map(item => 
        item.id === editingItem.id ? { ...newItem, id: editingItem.id } : item
      ));
    } else {
      const item = {
        ...newItem,
        id: `item-${Date.now()}`,
        amount: parseFloat(newItem.amount)
      };
      
      // Handle recurring items
      if (item.frequency === 'monthly') {
        const recurringItems = months.map((month, index) => ({
          ...item,
          id: `${item.id}-${index}`,
          monthId: month.id
        }));
        setItems([...items, ...recurringItems]);
      } else if (item.frequency === 'biweekly') {
        const recurringItems = [];
        months.forEach((month, index) => {
          // Add 2 items per month for biweekly
          recurringItems.push({
            ...item,
            id: `${item.id}-${index}-1`,
            monthId: month.id,
            name: `${item.name} (1st)`
          });
          recurringItems.push({
            ...item,
            id: `${item.id}-${index}-2`,
            monthId: month.id,
            name: `${item.name} (2nd)`
          });
        });
        setItems([...items, ...recurringItems]);
      } else {
        // For optional items, auto-place in earliest affordable month
        if (item.type === 'optional') {
          const earliestMonth = findEarliestAffordableMonth(item.amount);
          item.monthId = earliestMonth;
        }
        setItems([...items, item]);
      }
    }
    
    resetModal();
    // Auto-save after adding/editing
    setTimeout(() => saveToLocalStorage(), 100);
  };

  const resetModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setNewItem({
      name: '',
      amount: 0,
      type: 'expense',
      frequency: 'once',
      monthId: months[0]?.id || ''
    });
  };

  const deleteItem = (itemId) => {
    setItems(items.filter(item => item.id !== itemId));
    setTimeout(() => saveToLocalStorage(), 100);
  };

  const editItem = (item) => {
    setEditingItem(item);
    setNewItem({ ...item });
    setShowAddModal(true);
  };

  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetMonthId) => {
    e.preventDefault();
    if (!draggedItem) return;

    // Check if this is an optional item and validate affordability
    if (draggedItem.type === 'optional') {
      const targetMonthIndex = balancedMonths.findIndex(m => m.id === targetMonthId);
      const cumulativeBeforeTarget = balancedMonths
        .slice(0, targetMonthIndex + 1)
        .reduce((sum, month) => sum + month.monthlyBalance, 0);
      
      if (cumulativeBeforeTarget < draggedItem.amount) {
        // Auto-move to earliest affordable month instead
        const earliestMonth = findEarliestAffordableMonth(draggedItem.amount);
        setItems(items.map(item => 
          item.id === draggedItem.id ? { ...item, monthId: earliestMonth } : item
        ));
        setDraggedItem(null);
        return;
      }
    }

    // Move item to target month
    setItems(items.map(item => 
      item.id === draggedItem.id ? { ...item, monthId: targetMonthId } : item
    ));
    setDraggedItem(null);
    setTimeout(() => saveToLocalStorage(), 100);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Personal Cashflow Tracker</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowChart(!showChart)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
            >
              <BarChart3 size={20} />
              {showChart ? 'Hide Chart' : 'Show Chart'}
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition-colors"
            >
              <Settings size={20} />
              Settings
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Add Item
            </button>
          </div>
        </div>

        {/* Chart Section */}
        {showChart && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Cashflow Visualization</h2>
            <div style={{ width: '100%', height: '400px' }}>
              <ResponsiveContainer>
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${Math.abs(value).toLocaleString()}`, 
                      name === 'cumulative' ? 'Cumulative Balance' : 
                      name === 'income' ? 'Income' :
                      name === 'expenses' ? 'Fixed Expenses' : 'Optional Purchases'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="income" stackId="a" fill="#10b981" name="Income" />
                  <Bar dataKey="expenses" stackId="a" fill="#ef4444" name="Fixed Expenses" />
                  <Bar dataKey="optional" stackId="a" fill="#8b5cf6" name="Optional Purchases" />
                  <Line 
                    type="monotone" 
                    dataKey="cumulative" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    name="Cumulative Balance"
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {balancedMonths.map((month, index) => (
              <div 
                key={month.id} 
                className="bg-white rounded-lg shadow-md p-4 min-w-64"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, month.id)}
              >
                <h3 className="font-semibold text-lg mb-3 text-center border-b pb-2">
                  {month.name}
                </h3>
                
                <div className="min-h-40 space-y-2">
                  {month.items.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      className={`p-3 rounded-lg border-l-4 cursor-move transition-all hover:shadow-md ${
                        item.type === 'income' 
                          ? 'bg-green-50 border-green-500' 
                          : item.type === 'optional'
                          ? 'bg-purple-50 border-purple-500'
                          : 'bg-red-50 border-red-500'
                      } ${draggedItem?.id === item.id ? 'opacity-50' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2 flex-1">
                          <GripVertical size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.name}</div>
                            <div className={`text-lg font-bold ${
                              item.type === 'income' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {item.type === 'income' ? '+' : '-'}${Math.abs(item.amount).toLocaleString()}
                            </div>
                            {item.type === 'optional' && (
                              <div className="text-xs text-purple-600 font-medium">Optional</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => editItem(item)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Monthly:</span>
                    <span className={`font-semibold ${
                      month.monthlyBalance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {month.monthlyBalance >= 0 ? '+' : ''}${month.monthlyBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span>Cumulative:</span>
                    <span className={`${
                      month.cumulativeBalance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${month.cumulativeBalance.toLocaleString()}
                    </span>
                  </div>
                  {month.cumulativeBalance < 0 && (
                    <div className="text-xs text-red-500 mt-1">⚠️ Negative balance</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
              <h3 className="text-lg font-semibold mb-4">Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Google Sheets URL</label>
                  <input
                    type="url"
                    value={googleSheetsUrl}
                    onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Make sure your Google Sheet is set to "Anyone with the link can edit"
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveToGoogleSheets}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    Save to Sheets
                  </button>
                  <button
                    onClick={loadFromGoogleSheets}
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Load from Sheets
                  </button>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm text-yellow-700">
                    <strong>Note:</strong> Full Google Sheets integration requires additional API setup. 
                    Currently using local storage as backup.
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
              <h3 className="text-lg font-semibold mb-4">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Salary, Netflix, New Car"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Amount ($)</label>
                  <input
                    type="number"
                    value={newItem.amount}
                    onChange={(e) => setNewItem({...newItem, amount: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={newItem.type}
                    onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="income">Income</option>
                    <option value="expense">Fixed Expense</option>
                    <option value="optional">Optional Purchase</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Frequency</label>
                  <select
                    value={newItem.frequency}
                    onChange={(e) => setNewItem({...newItem, frequency: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="once">One-time</option>
                    <option value="monthly">Monthly</option>
                    <option value="biweekly">Bi-weekly</option>
                  </select>
                </div>

                {newItem.frequency === 'once' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Month</label>
                    <select
                      value={newItem.monthId}
                      onChange={(e) => setNewItem({...newItem, monthId: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {months.map(month => (
                        <option key={month.id} value={month.id}>{month.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {newItem.type === 'optional' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="text-sm text-purple-700">
                      <strong>Optional items</strong> are automatically placed in the earliest month where you have enough cumulative cash to afford them.
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={resetModal}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={!newItem.name || !newItem.amount}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {editingItem ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashflowTracker;