import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet } from 'react-native';
import { useLanguage } from '@/app/languageSelector';
import { Database } from '@/components/db/database';
import { AlertTriangle, Book, Globe, Bell, Moon, Save, Trash2 } from 'lucide-react-native';

export default function SettingsScreen() {
  const { sourceLanguage, targetLanguage, setSourceLanguage, setTargetLanguage } = useLanguage();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoDownload, setAutoDownload] = useState(true);

  const handleClearData = async () => {
    const database = new Database();
    //await database.clearAllTables();
    setShowConfirmation(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        
        {/* Language Settings */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Globe size={24} color="#4b5563" />
            <Text style={styles.cardTitle}>Language Settings</Text>
          </View>
          
          <View style={styles.cardContent}>
            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingLabel}>Source Language</Text>
              <Text style={styles.settingValue}>{sourceLanguage}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingLabel}>Target Language</Text>
              <Text style={styles.settingValue}>{targetLanguage}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reading Settings */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Book size={24} color="#4b5563" />
            <Text style={styles.cardTitle}>Reading Settings</Text>
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Auto-download Books</Text>
              <Switch
                value={autoDownload}
                onValueChange={setAutoDownload}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={autoDownload ? '#2563eb' : '#9ca3af'}
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={darkMode ? '#2563eb' : '#9ca3af'}
              />
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Bell size={24} color="#4b5563" />
            <Text style={styles.cardTitle}>Notifications</Text>
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Daily Reminders</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={notifications ? '#2563eb' : '#9ca3af'}
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Save size={24} color="#4b5563" />
            <Text style={styles.cardTitle}>Data Management</Text>
          </View>
          
          {!showConfirmation ? (
            <TouchableOpacity 
              onPress={() => setShowConfirmation(true)}
              style={styles.deleteButton}
            >
              <View style={styles.deleteButtonContent}>
                <Trash2 size={20} color="#ef4444" />
                <Text style={styles.deleteButtonText}>Clear All Data</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.confirmationCard}>
              <View style={styles.confirmationHeader}>
                <AlertTriangle size={20} color="#ef4444" />
                <Text style={styles.confirmationTitle}>Confirm Deletion</Text>
              </View>
              <Text style={styles.confirmationText}>
                This will permanently delete all your books, cards, and progress. This action cannot be undone.
              </Text>
              <View style={styles.confirmationButtons}>
                <TouchableOpacity 
                  onPress={() => setShowConfirmation(false)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleClearData}
                  style={styles.confirmDeleteButton}
                >
                  <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
  },
  cardContent: {
    gap: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#4b5563',
  },
  settingValue: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  deleteButton: {
    paddingVertical: 8,
  },
  deleteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ef4444',
    marginLeft: 8,
    fontSize: 16,
  },
  confirmationCard: {
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 8,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmationTitle: {
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  confirmationText: {
    color: '#ef4444',
    marginBottom: 16,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#374151',
  },
  confirmDeleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  confirmDeleteButtonText: {
    color: 'white',
  },
});