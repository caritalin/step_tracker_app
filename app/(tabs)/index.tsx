import React, { useState, useEffect } from "react";
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    Button,
    FlatList,
    TouchableOpacity,
    Image,
    Alert,
    Dimensions,
    Modal,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hae näytön mitat
const { width, height } = Dimensions.get("window");

// Vakioarvot palkkien koon ja marginaalien laskemiseen
const ITEM_MARGIN = 10; // Palkkien välimatka

// Näytön kokoon perustuvat rajoitukset
const SMALL_SCREEN_THRESHOLD = 600; // Rajapyykki pienen ja suuren näytön välillä
const SMALL_SCREEN_ITEM_SIZE = 120; // Palkin koko pienellä näytöllä
const LARGE_SCREEN_ITEM_SIZE = 150; // Palkin koko suurella näytöllä

const STORAGE_KEY = '@step_goals';

interface Goal {
    stepGoal: number;
    completed: boolean;
    date?: string; // Päivämäärä, jolloin merkintä on tehty
    inputSteps?: string; // Jos askelmäärä on syötetty, se tallennetaan tässä
}

export default function App() {
    const [steps, setSteps] = useState<string>("");
    const [goals, setGoals] = useState<Goal[]>(
        Array.from({ length: 31 }, (_, i) => ({
            stepGoal: (i + 1) * 1000, // 1000 -> 31000
            completed: false,
        }))
    );
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

    useEffect(() => {
        loadGoals();
    }, []);

    useEffect(() => {
        saveGoals();
    }, [goals]);

    const loadGoals = async () => {
        try {
            const savedGoals = await AsyncStorage.getItem(STORAGE_KEY);
            if (savedGoals !== null) {
                setGoals(JSON.parse(savedGoals));
            }
        } catch (error) {
            console.error('Failed to load goals:', error);
        }
    };

    const saveGoals = async () => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
        } catch (error) {
            console.error('Failed to save goals:', error);
        }
    };

    // Päätä näytön asettelu koon perusteella
    const isSmallScreen = width < SMALL_SCREEN_THRESHOLD;
    const ITEM_SIZE = isSmallScreen ? SMALL_SCREEN_ITEM_SIZE : LARGE_SCREEN_ITEM_SIZE;
    const numColumns = isSmallScreen ? 2 : Math.floor(width / (ITEM_SIZE + ITEM_MARGIN * 2));

    // Lisää tai päivitä suoritettu askeltavoite
    const handleAddStep = () => {
        const stepValue = parseInt(steps);

        // Tarkista, että syöte on numero ja se on vähintään 1000
        if (stepValue >= 1000 && stepValue <= 100000) {
            // Pyöristä alaspäin lähimpään tuhanteen
            const roundedStepValue = Math.min(Math.floor(stepValue / 1000) * 1000, 31000);
            const date = new Date().toISOString().split('T')[0]; // Hanki nykyinen päivämäärä

            setGoals((prevGoals) =>
                prevGoals.map((goal) =>
                    goal.stepGoal === roundedStepValue
                        ? { ...goal, completed: true, date, inputSteps: steps }
                        : goal
                )
            );
            setSteps(""); // Tyhjennä syötekenttä
        } else {
            Alert.alert("Virhe!", 'Syötä validi askelmäärä (vähintään 1000 ja korkeintaan 100000).');
        }
    };

    // Poista suoritus askeltavoitteesta
    const handleRemoveStep = (stepGoal: number) => {
        setGoals((prevGoals) =>
            prevGoals.map((goal) =>
                goal.stepGoal === stepGoal ? { ...goal, completed: false, date: undefined, inputSteps: undefined } : goal
            )
        );
    };

    // Merkitse laatikko suoritetuksi tai ei-suoritetuksi
    const handleToggleStep = (stepGoal: number) => {
        const date = new Date().toISOString().split('T')[0]; // Hanki nykyinen päivämäärä
        setGoals((prevGoals) =>
            prevGoals.map((goal) =>
                goal.stepGoal === stepGoal
                    ? { ...goal, completed: !goal.completed, date: !goal.completed ? date : undefined }
                    : goal
            )
        );
    };

    // Näytä tiedot modalissa
    const handleShowDetails = (goal: Goal) => {
        setSelectedGoal(goal);
        setModalVisible(true);
    };

    // Poista kaikki suoritukset ja tyhjennä AsyncStorage
    const handleRemoveAllSteps = async () => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
            setGoals((prevGoals) =>
                prevGoals.map((goal) => ({ ...goal, completed: false, date: undefined, inputSteps: undefined }))
            );
        } catch (error) {
            console.error('Failed to clear goals:', error);
        }
    };

    // Laske suoritetut tavoitteet
    const completedGoals = goals.filter((goal) => goal.completed).length;
    const progressPercentage = (completedGoals / goals.length) * 100;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Askeltavoiteseuranta</Text>

            {/* Suoritusprosenttipalkki */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>
                Suoritettu: {completedGoals}/{goals.length} ({progressPercentage.toFixed(0)}%)
            </Text>

            {/* Syötekenttä */}
            <TextInput
                style={styles.input}
                placeholder="Syötä askelmäärä (esim. 1000)"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
                value={steps}
                onChangeText={(text) => setSteps(text)}
            />

            {/* Lisää-painike */}
            <Button title="Merkitse suoritetuksi" onPress={handleAddStep} color="#4caf50" />

            {/* Askeltavoitelistaus */}
            <FlatList
                data={goals}
                numColumns={numColumns} // Dynaamisesti lasketaan sarakkeiden määrä
                keyExtractor={(item) => item.stepGoal.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => handleShowDetails(item)}
                        style={[
                            styles.goalItem,
                            {
                                width: ITEM_SIZE,
                                height: ITEM_SIZE,
                                margin: ITEM_MARGIN,
                            },
                            item.completed && styles.completedGoal,
                        ]}
                    >
                        <Text style={styles.goalText}>{item.stepGoal}</Text>
                        {item.completed && (
                            <TouchableOpacity
                                onPress={() => handleRemoveStep(item.stepGoal)}
                                style={styles.trashButton}
                            >
                                <Image
                                    source={require("./trash-icon.png")}
                                    style={styles.trashIcon}
                                />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                )}
            />
            {/* Poista kaikki suoritukset -painike */}
            <TouchableOpacity style={styles.clearButton} onPress={handleRemoveAllSteps}>
                <Text style={styles.clearButtonText}>Tyhjennä</Text>
            </TouchableOpacity>

            {/* Modal yksityiskohtaisia tietoja varten */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(!modalVisible);
                }}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Askelmäärän tiedot</Text>
                        {selectedGoal && (
                            <>
                                <Text style={styles.modalText}>Askelmäärä: {selectedGoal.inputSteps ?? selectedGoal.stepGoal}</Text>
                                <Text style={styles.modalText}>Päivämäärä: {selectedGoal.date}</Text>
                                <TouchableOpacity
                                    style={styles.toggleButton}
                                    onPress={() => {
                                        handleToggleStep(selectedGoal.stepGoal);
                                        setModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.toggleButtonText}>
                                        {selectedGoal.completed ? 'Poista suoritus' : 'Merkitse suoritetuksi'}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setModalVisible(!modalVisible)}
                        >
                            <Text style={styles.closeButtonText}>Sulje</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#121212",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
        color: "#fff",
    },
    input: {
        borderWidth: 1,
        borderColor: "#333",
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
        fontSize: 16,
        color: "#fff",
        backgroundColor: "#1e1e1e",
    },
    progressContainer: {
        height: 20,
        backgroundColor: "#333",
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 10,
    },
    progressBar: {
        height: "100%",
        backgroundColor: "#4caf50",
    },
    progressText: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 20,
        color: "#fff",
    },
    goalItem: {
        borderWidth: 1,
        borderColor: "#333",
        borderRadius: 10,
        backgroundColor: "#1e1e1e",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 10,
        flex: 1,
    },
    goalText: {
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
        color: "#fff",
    },
    completedGoal: {
        backgroundColor: "#388e3c",
    },
    trashButton: {
        marginTop: 5,
        marginRight: 5,
    },
    trashIcon: {
        width: 24,
        height: 24,
        tintColor: "#fff",
    },
    clearButton: {
        backgroundColor: "#f44336",
        padding: 15,
        borderRadius: 10,
        marginTop: 10,
    },
    clearButtonText: {
        color: "#fff",
        fontSize: 18,
        textAlign: "center",
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalView: {
        width: "80%",
        backgroundColor: "#1e1e1e",
        borderRadius: 10,
        padding: 20,
        alignItems: "center",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 15,
        color: "#fff",
    },
    modalText: {
        fontSize: 16,
        color: "#fff",
        marginBottom: 10,
    },
    toggleButton: {
        backgroundColor: "#4caf50",
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
    },
    toggleButtonText: {
        color: "#fff",
        fontSize: 16,
    },
    closeButton: {
        backgroundColor: "#4caf50",
        padding: 10,
        borderRadius: 5,
    },
    closeButtonText: {
        color: "#fff",
        fontSize: 16,
    },
});