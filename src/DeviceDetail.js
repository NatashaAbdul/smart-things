import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import "./App.css";
import "./devicedetail.css";

function DeviceDetail() {
  const deviceId = "b30a27b8-a43a-008e-72e5-08394c3b4b8c";
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [remoteStatus, setRemoteStatus] = useState("");
  const [isPoweredOn, setIsPoweredOn] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [authToken, setAuthToken] = useState("");

  const lightDevices = {
    ceilingLight1: "e9bd275a-91ee-470c-abc9-d279e5d48a9d",
    ceilingLight2: "ceb3a76d-d18f-46a3-9acd-26a49ce57a90",
    ceilingLight4: "1f787da4-4b86-40bc-b666-507ef599bdb6",
    ceilingLight3: "9932489b-ba58-45a5-8567-db00fd28ae2a",
    stripLight2: "84360001-f8fc-486c-9bea-19463c22b8ab",
    stripLight3: "b85a23a4-a1fb-4365-8c3f-89d24ff2e79b",
    stripLight4: "d8dc9b56-a043-4a58-9cde-d455fff2d414",
    stripLight1: "f63ce90f-2f13-4a44-9181-0d1d72f76792",
    stripLight5: "f0e3229b-843a-4bf4-8143-675b9fab3759",
    stripLight6: "dc9fe4c9-3a32-18c2-cd0c-0426afe6f3ef",
  };
  // Add your service account token here
  const serviceAccountToken = "Bearer xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxx";

  // Function to get JWT token
  const getJwtToken = () => {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", serviceAccountToken);
    myHeaders.append("Accept", "application/vnd.smartthings+json;v=2");

    const raw = JSON.stringify({
      expiresInSec: 7200,
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    return fetch(
      "https://enterprise.smartthings.com/auth/serviceaccount/token",
      requestOptions
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("HTTP error " + response.status);
        }
        return response.json();
      })
      .then((result) => {
        console.log("JWT Token Response:", result);
        if (result && result.token) {
          setAuthToken(result.token);
          return result.token;
        } else {
          throw new Error("Invalid token response");
        }
      })
      .catch((error) => {
        console.error("Fetch error:", error);
        throw error;
      });
  };

  const getRequestOptions = (method = "GET", body = null) => {
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Bearer ${authToken}`);
    myHeaders.append("Accept", "application/vnd.smartthings+json;v=2");
    if (body) {
      myHeaders.append("Content-Type", "application/json");
    }

    return {
      method: method,
      headers: myHeaders,
      redirect: "follow",
      body: body ? JSON.stringify(body) : null,
    };
  };

  // Initialize authentication and device data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        // First get the JWT token
        await getJwtToken();
      } catch (error) {
        setError("Failed to authenticate: " + error.message);
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Fetch device details when authToken is available
  useEffect(() => {
    const fetchDeviceDetails = async () => {
      if (!authToken) return; // Wait for authToken to be set

      try {
        const response = await fetch(
          `https://enterprise.smartthings.com/devices/${deviceId}`,
          getRequestOptions()
        );
        if (!response.ok) {
          throw new Error("HTTP error " + response.status);
        }
        const result = await response.json();
        setDevice(result);

        // Fetch initial device status to determine power state
        fetchDeviceStatus();
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceDetails();
  }, [authToken, deviceId]);

  useEffect(() => {
    // Generate QR code URL when deviceId is available
    if (deviceId) {
      const deviceUrl = `https://serene-entremet-ea2207.netlify.app/#/device/${deviceId}`;
      const qrCodeGeneratorUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        deviceUrl
      )}`;
      setQrCodeUrl(qrCodeGeneratorUrl);
    }
  }, [deviceId]);

  const fetchDeviceStatus = async () => {
    if (!authToken) return;

    try {
      const response = await fetch(
        `https://enterprise.smartthings.com/devices/${deviceId}/status`,
        getRequestOptions()
      );
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const statusData = await response.json();

      // Extract switch status from the response
      const switchStatus = statusData.components?.main?.switch?.switch?.value;
      setIsPoweredOn(switchStatus === "on");
    } catch (error) {
      console.error("Error fetching device status:", error);
    }
  };

  const sendRemoteCommand = async (command, commandBody = null) => {
    if (!authToken) {
      setRemoteStatus("Authentication required. Please refresh the page.");
      return;
    }

    setRemoteStatus(`Sending ${command}...`);

    try {
      if (commandBody) {
        // Send actual POST command for remote control
        const response = await fetch(
          `https://enterprise.smartthings.com/devices/${deviceId}/commands?ordered=true`,
          getRequestOptions("POST", commandBody)
        );

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
      } else {
        // For other commands, simulate as before
        console.log(`Sending command: ${command} to device: ${deviceId}`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setRemoteStatus(`${command} command sent successfully!`);

      // Clear status after 3 seconds
      setTimeout(() => setRemoteStatus(""), 3000);
    } catch (error) {
      setRemoteStatus(`Failed to send ${command} command`);
      console.error("Remote command error:", error);
    }
  };

  const powerOn = async () => {
    if (!authToken) {
      setRemoteStatus("Authentication required. Please refresh the page.");
      return;
    }

    setRemoteStatus("Sending Power On...");

    try {
      const commandBody = {
        commands: [
          {
            component: "main",
            capability: "switch",
            command: "on",
          },
        ],
      };

      const response = await fetch(
        `https://enterprise.smartthings.com/devices/${deviceId}/commands?ordered=true`,
        getRequestOptions("POST", commandBody)
      );

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      setRemoteStatus("Power On command sent successfully!");
      setIsPoweredOn(true);

      // Refresh device status after a short delay
      setTimeout(() => {
        fetchDeviceStatus();
      }, 1000);

      // Clear status after 3 seconds
      setTimeout(() => setRemoteStatus(""), 3000);
    } catch (error) {
      setRemoteStatus("Failed to send Power On command");
      console.error("Power On error:", error);
    }
  };

  const powerOff = async () => {
    if (!authToken) {
      setRemoteStatus("Authentication required. Please refresh the page.");
      return;
    }

    setRemoteStatus("Sending Power Off...");

    try {
      const commandBody = {
        commands: [
          {
            component: "main",
            capability: "switch",
            command: "off",
          },
        ],
      };

      const response = await fetch(
        `https://enterprise.smartthings.com/devices/${deviceId}/commands?ordered=true`,
        getRequestOptions("POST", commandBody)
      );

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      setRemoteStatus("Power Off command sent successfully!");
      setIsPoweredOn(false);

      // Refresh device status after a short delay
      setTimeout(() => {
        fetchDeviceStatus();
      }, 1000);

      // Clear status after 3 seconds
      setTimeout(() => setRemoteStatus(""), 3000);
    } catch (error) {
      setRemoteStatus("Failed to send Power Off command");
      console.error("Power Off error:", error);
    }
  };

  // Volume control functions
  const volumeUp = async () => {
    const commandBody = {
      commands: [
        {
          component: "main",
          capability: "audioVolume",
          command: "volumeUp",
        },
      ],
    };
    await sendRemoteCommand("Volume Up", commandBody);
  };

  const volumeDown = async () => {
    const commandBody = {
      commands: [
        {
          component: "main",
          capability: "audioVolume",
          command: "volumeDown",
        },
      ],
    };
    await sendRemoteCommand("Volume Down", commandBody);
  };

  // Mute function
  const mute = async () => {
    const commandBody = {
      commands: [
        {
          component: "main",
          capability: "audioMute",
          command: "mute",
        },
      ],
    };
    await sendRemoteCommand("Mute", commandBody);
  };

  // Back function
  const back = async () => {
    const commandBody = {
      commands: [
        {
          component: "main",
          capability: "samsungvd.remoteControl",
          command: "send",
          arguments: ["BACK", "PRESS_AND_RELEASED"],
        },
      ],
    };
    await sendRemoteCommand("Back", commandBody);
  };

  // Home function
  const home = async () => {
    const commandBody = {
      commands: [
        {
          component: "main",
          capability: "samsungvd.remoteControl",
          command: "send",
          arguments: ["HOME", "PRESS_AND_RELEASED"],
        },
      ],
    };
    await sendRemoteCommand("Home", commandBody);
  };

  // Channel control functions
  const channelUp = async () => {
    const commandBody = {
      commands: [
        {
          component: "main",
          capability: "tvChannel",
          command: "channelUp",
        },
      ],
    };
    await sendRemoteCommand("Channel Up", commandBody);
  };

  const channelDown = async () => {
    const commandBody = {
      commands: [
        {
          component: "main",
          capability: "tvChannel",
          command: "channelDown",
        },
      ],
    };
    await sendRemoteCommand("Channel Down", commandBody);
  };

  // Navigation button functions
  const navigateUp = async () => {
    const commandBody = {
      commands: [
        {
          component: "main",
          capability: "samsungvd.remoteControl",
          command: "send",
          arguments: ["UP", "PRESS_AND_RELEASED"],
        },
      ],
    };
    await sendRemoteCommand("Up", commandBody);
  };

  const navigateDown = async () => {
    const commandBody = {
      commands: [
        {
          component: "main",
          capability: "samsungvd.remoteControl",
          command: "send",
          arguments: ["DOWN", "PRESS_AND_RELEASED"],
        },
      ],
    };
    await sendRemoteCommand("Down", commandBody);
  };

  const navigateLeft = async () => {
    const commandBody = {
      commands: [
        {
          component: "main",
          capability: "samsungvd.remoteControl",
          command: "send",
          arguments: ["LEFT", "PRESS_AND_RELEASED"],
        },
      ],
    };
    await sendRemoteCommand("Left", commandBody);
  };

  const navigateRight = async () => {
    const commandBody = {
      commands: [
        {
          component: "main",
          capability: "samsungvd.remoteControl",
          command: "send",
          arguments: ["RIGHT", "PRESS_AND_RELEASED"],
        },
      ],
    };
    await sendRemoteCommand("Right", commandBody);
  };

  const navigateOK = async () => {
    const commandBody = {
      commands: [
        {
          component: "main",
          capability: "samsungvd.remoteControl",
          command: "send",
          arguments: ["OK", "PRESS_AND_RELEASED"],
        },
      ],
    };
    await sendRemoteCommand("OK/Select", commandBody);
  };

  if (loading)
    return (
      <div className="App">
        <header className="App-header">Loading device details...</header>
      </div>
    );
  if (error)
    return (
      <div className="App">
        <header className="App-header">Error: {error}</header>
      </div>
    );
  if (!device)
    return (
      <div className="App">
        <header className="App-header">Device not found</header>
      </div>
    );

  const controlLight = async (lightName, deviceId, action) => {
    if (!authToken) {
      return;
    }

    try {
      const commandBody = {
        commands: [
          {
            component: "main",
            capability: "switch",
            command: action,
          },
        ],
      };

      const response = await fetch(
        `https://enterprise.smartthings.com/devices/${deviceId}/commands?ordered=true`,
        getRequestOptions("POST", commandBody)
      );

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
    } catch (error) {
      console.error("Light control error:", error);
    }
  };

  const turnOnCeilingLight1 = async () => {
    await controlLight("Ceiling Light 1", lightDevices.ceilingLight1, "on");
  };

  const turnOffCeilingLight1 = async () => {
    await controlLight("Ceiling Light 1", lightDevices.ceilingLight1, "off");
  };

  const turnOnCeilingLight2 = async () => {
    await controlLight("Ceiling Light 2", lightDevices.ceilingLight2, "on");
  };

  const turnOffCeilingLight2 = async () => {
    await controlLight("Ceiling Light 2", lightDevices.ceilingLight2, "off");
  };

  const turnOnCeilingLight3 = async () => {
    await controlLight("Ceiling Light 3", lightDevices.ceilingLight3, "on");
  };

  const turnOffCeilingLight3 = async () => {
    await controlLight("Ceiling Light 3", lightDevices.ceilingLight3, "off");
  };

  const turnOnCeilingLight4 = async () => {
    await controlLight("Ceiling Light 4", lightDevices.ceilingLight4, "on");
  };

  const turnOffCeilingLight4 = async () => {
    await controlLight("Ceiling Light 4", lightDevices.ceilingLight4, "off");
  };

  const turnOnStripLight1 = async () => {
    await controlLight("Strip Light 1", lightDevices.stripLight1, "on");
  };

  const turnOffStripLight1 = async () => {
    await controlLight("Strip Light 1", lightDevices.stripLight1, "off");
  };

  const turnOnStripLight2 = async () => {
    await controlLight("Strip Light 2", lightDevices.stripLight2, "on");
  };

  const turnOffStripLight2 = async () => {
    await controlLight("Strip Light 2", lightDevices.stripLight2, "off");
  };
  const turnOnStripLight3 = async () => {
    await controlLight("Strip Light 3", lightDevices.stripLight3, "on");
  };

  const turnOffStripLight3 = async () => {
    await controlLight("Strip Light 3", lightDevices.stripLight3, "off");
  };

  const turnOnStripLight4 = async () => {
    await controlLight("Strip Light 4", lightDevices.stripLight4, "on");
  };

  const turnOffStripLight4 = async () => {
    await controlLight("Strip Light 4", lightDevices.stripLight4, "off");
  };

  const turnOnStripLight5 = async () => {
    await controlLight("Strip Light 5", lightDevices.stripLight5, "on");
  };

  const turnOffStripLight5 = async () => {
    await controlLight("Strip Light 5", lightDevices.stripLight5, "off");
  };

  const turnOnStripLight6 = async () => {
    await controlLight("Strip Light 5", lightDevices.stripLight6, "on");
  };

  const turnOffStripLight6 = async () => {
    await controlLight("Strip Light 5", lightDevices.stripLight6, "off");
  };

  return (
    <div className="App">
      <header className="App-header">
        {/* TV Remote Control */}
        <div className="remote-container">
          <h4 className="remote-title">TV Remote Control</h4>

          {/* Power Buttons */}
          <div className="power-buttons-container">
            <button className="power-on-button" onClick={powerOn}>
              Power On
            </button>
            <button className="power-off-button" onClick={powerOff}>
              Power Off
            </button>
          </div>

          {/* Navigation Pad */}
          <div className="navigation-pad">
            {/* Up Button */}
            <button className="nav-button" onClick={navigateUp}>
              ↑
            </button>

            {/* Middle Row - Left, OK, Right */}
            <div className="nav-row">
              <button className="nav-button" onClick={navigateLeft}>
                ←
              </button>

              <button className="ok-button" onClick={navigateOK}>
                OK
              </button>

              <button className="nav-button" onClick={navigateRight}>
                →
              </button>
            </div>

            {/* Down Button */}
            <button className="nav-button" onClick={navigateDown}>
              ↓
            </button>
          </div>

          {/* Additional Controls */}
          <div className="controls-row">
            <button className="control-button volume-button" onClick={volumeUp}>
              Vol +
            </button>

            <button
              className="control-button volume-button"
              onClick={volumeDown}
            >
              Vol -
            </button>

            <button className="control-button mute-button" onClick={mute}>
              Mute
            </button>

            <button
              className="control-button back-button-remote"
              onClick={back}
            >
              Back
            </button>

            <button className="control-button home-button" onClick={home}>
              Home
            </button>
          </div>

          {/* Channel Controls */}
          <div className="channel-row">
            <button className="channel-button" onClick={channelUp}>
              Ch +
            </button>

            <button className="channel-button" onClick={channelDown}>
              Ch -
            </button>
          </div>
        </div>

        {/* Ceiling Lights Section */}
        <div className="lights-section">
          <h5 className="lights-subtitle">Ceiling Lights</h5>
          <div className="lights-grid">
            {/* Ceiling Light 1 */}
            <div className="light-control-group">
              <span className="light-label">Ceiling Light 1</span>
              <div className="light-buttons">
                <button
                  className="light-button on-button"
                  onClick={turnOnCeilingLight1}
                >
                  On
                </button>
                <button
                  className="light-button off-button"
                  onClick={turnOffCeilingLight1}
                >
                  Off
                </button>
              </div>
            </div>

            {/* Ceiling Light 2 */}
            <div className="light-control-group">
              <span className="light-label">Ceiling Light 2</span>
              <div className="light-buttons">
                <button
                  className="light-button on-button"
                  onClick={turnOnCeilingLight2}
                >
                  On
                </button>
                <button
                  className="light-button off-button"
                  onClick={turnOffCeilingLight2}
                >
                  Off
                </button>
              </div>
            </div>

            {/* Ceiling Light 3 */}
            <div className="light-control-group">
              <span className="light-label">Ceiling Light 3</span>
              <div className="light-buttons">
                <button
                  className="light-button on-button"
                  onClick={turnOnCeilingLight3}
                >
                  On
                </button>
                <button
                  className="light-button off-button"
                  onClick={turnOffCeilingLight3}
                >
                  Off
                </button>
              </div>
            </div>

            {/* Ceiling Light 4 */}
            <div className="light-control-group">
              <span className="light-label">Ceiling Light 4</span>
              <div className="light-buttons">
                <button
                  className="light-button on-button"
                  onClick={turnOnCeilingLight4}
                >
                  On
                </button>
                <button
                  className="light-button off-button"
                  onClick={turnOffCeilingLight4}
                >
                  Off
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Strip Lights Section */}
        <div className="lights-section">
          <h5 className="lights-subtitle">Strip Lights</h5>
          <div className="lights-grid">
            {/* Strip Light 1 */}
            <div className="light-control-group">
              <span className="light-label">Strip Light 1</span>
              <div className="light-buttons">
                <button
                  className="light-button on-button"
                  onClick={turnOnStripLight1}
                >
                  On
                </button>
                <button
                  className="light-button off-button"
                  onClick={turnOffStripLight1}
                >
                  Off
                </button>
              </div>
            </div>

            {/* Strip Light 2 */}
            <div className="light-control-group">
              <span className="light-label">Strip Light 2</span>
              <div className="light-buttons">
                <button
                  className="light-button on-button"
                  onClick={turnOnStripLight2}
                >
                  On
                </button>
                <button
                  className="light-button off-button"
                  onClick={turnOffStripLight2}
                >
                  Off
                </button>
              </div>
            </div>

            {/* Strip Light 3 */}
            <div className="light-control-group">
              <span className="light-label">Strip Light 3</span>
              <div className="light-buttons">
                <button
                  className="light-button on-button"
                  onClick={turnOnStripLight3}
                >
                  On
                </button>
                <button
                  className="light-button off-button"
                  onClick={turnOffStripLight3}
                >
                  Off
                </button>
              </div>
            </div>

            {/* Strip Light 4 */}
            <div className="light-control-group">
              <span className="light-label">Strip Light 4</span>
              <div className="light-buttons">
                <button
                  className="light-button on-button"
                  onClick={turnOnStripLight4}
                >
                  On
                </button>
                <button
                  className="light-button off-button"
                  onClick={turnOffStripLight4}
                >
                  Off
                </button>
              </div>
            </div>

            {/* Strip Light 5 */}
            <div className="light-control-group">
              <span className="light-label">Strip Light 5</span>
              <div className="light-buttons">
                <button
                  className="light-button on-button"
                  onClick={turnOnStripLight5}
                >
                  On
                </button>
                <button
                  className="light-button off-button"
                  onClick={turnOffStripLight5}
                >
                  Off
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Art Section */}
        <div className="lights-section">
          <h5 className="lights-subtitle">Art Mood</h5>
          <div className="light-buttons">
            <button
              className="light-button on-button"
              onClick={turnOnStripLight6}
            >
              On
            </button>
            <button
              className="light-button off-button"
              onClick={turnOffStripLight6}
            >
              Off
            </button>
          </div>
          <div className="lights-grid"></div>
        </div>
      </header>
    </div>
  );
}

export default DeviceDetail;
