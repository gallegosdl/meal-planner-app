import React, { useState, useEffect } from 'react';

const VoiceMicButton = () => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('SpeechRecognition not supported in this browser.');
      return;
    }

    const recog = new window.webkitSpeechRecognition();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = 'en-US';

    recog.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice Transcript:', transcript);
      // You can add NLP or send this to server later
    };

    recog.onerror = (event) => {
      console.error('SpeechRecognition error:', event.error);
    };

    recog.onend = () => {
      setIsListening(false);
    };

    setRecognition(recog);
  }, []);

  const toggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  return (
    <button
      onClick={toggleListening}
      className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
        isListening ? 'bg-red-600 animate-pulse ring-2 ring-red-300' : 'bg-blue-600 hover:bg-blue-700'
      } transition-colors`}
      title={isListening ? 'Listening...' : 'Click to speak'}
    >
        <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 text-white"
        fill="currentColor"
        viewBox="0 0 24 24"
        >
        <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zm-5 7c-3.31 0-6-2.69-6-6H5a7 7 0 0 0 14 0h-2c0 3.31-2.69 6-6 6zm1 3h-2v2h2v-2z" />
        </svg>
    </button>
  );
};

export default VoiceMicButton;
