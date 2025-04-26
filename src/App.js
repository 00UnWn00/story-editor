import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [scenes, setScenes] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const [editingSceneName, setEditingSceneName] = useState(null);
  const sceneNameInputRef = useRef(null);

  // 컴포넌트 마운트 시 로컬 스토리지에서 데이터 로드
  useEffect(() => {
    const savedData = localStorage.getItem("storyEditorData");
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setScenes(parsedData.scenes);
        setLastSaved(parsedData.timestamp);
      } catch (e) {
        console.error("저장된 데이터를 불러오는 중 오류가 발생했습니다:", e);
      }
    }
  }, []);

  // 편집 모드일 때 외부 클릭 감지
  useEffect(() => {
    if (editingSceneName !== null) {
      const handleClickOutside = (event) => {
        if (sceneNameInputRef.current && !sceneNameInputRef.current.contains(event.target)) {
          setEditingSceneName(null);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [editingSceneName]);

  // 데이터가 변경될 때마다 로컬 스토리지에 자동 저장 (디바운스 적용)
  useEffect(() => {
    if (scenes.length > 0) {
      const timeoutId = setTimeout(() => {
        const timestamp = new Date().toLocaleString();
        const dataToSave = {
          scenes,
          timestamp
        };
        localStorage.setItem("storyEditorData", JSON.stringify(dataToSave));
        setLastSaved(timestamp);
      }, 1000); // 1초 디바운스

      return () => clearTimeout(timeoutId);
    }
  }, [scenes]);

  const addScene = () => {
    setScenes([
      ...scenes,
      {
        id: scenes.length + 1,
        name: `씬 ${scenes.length + 1}`,
        lines: [
          {
            name: "",
            mood: "",
            content: "",
            func: "",
            choices: [],
            noChoice: true,
          },
        ],
        collapsed: false,
      },
    ]);
  };

  // 씬 삭제 기능 추가
  const deleteScene = (sceneIndex) => {
    if (window.confirm("정말로 이 씬을 삭제하시겠습니까? 모든 대사와 선택지가 함께 삭제됩니다.")) {
      const newScenes = [...scenes];
      newScenes.splice(sceneIndex, 1);
      
      // 씬 ID 재정렬
      newScenes.forEach((scene, index) => {
        scene.id = index + 1;
      });
      
      setScenes(newScenes);
    }
  };

  const updateScene = (sceneIndex, field, value) => {
    const newScenes = [...scenes];
    newScenes[sceneIndex][field] = value;
    setScenes(newScenes);
  };

  const updateLine = (sceneIndex, lineIndex, field, value) => {
    const newScenes = [...scenes];
    newScenes[sceneIndex].lines[lineIndex][field] = value;
    setScenes(newScenes);
  };

  const addLine = (sceneIndex, lineIndex = null) => {
    const newScenes = [...scenes];
    const newLine = { name: "", mood: "", content: "", func: "", choices: [], noChoice: true };
    if (lineIndex === null) {
      newScenes[sceneIndex].lines.push(newLine);
    } else {
      newScenes[sceneIndex].lines.splice(lineIndex + 1, 0, newLine);
    }
    setScenes(newScenes);
  };

  const deleteLine = (sceneIndex, lineIndex) => {
    if (window.confirm("정말로 이 대사를 삭제하시겠습니까?")) {
      const newScenes = [...scenes];
      newScenes[sceneIndex].lines.splice(lineIndex, 1);
      
      // 대사를 모두 삭제한 경우 기본 대사 하나 추가
      if (newScenes[sceneIndex].lines.length === 0) {
        newScenes[sceneIndex].lines.push({
          name: "",
          mood: "",
          content: "",
          func: "",
          choices: [],
          noChoice: true,
        });
      }
      
      setScenes(newScenes);
    }
  };

  const handleKeyDown = (e, sceneIndex, lineIndex) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      addLine(sceneIndex, lineIndex);
    }
  };

  const updateChoice = (sceneIndex, lineIndex, choiceIndex, field, value) => {
    const newScenes = [...scenes];
    newScenes[sceneIndex].lines[lineIndex].choices[choiceIndex][field] = value;
    setScenes(newScenes);
  };

  const addChoice = (sceneIndex, lineIndex) => {
    const newScenes = [...scenes];
    newScenes[sceneIndex].lines[lineIndex].choices.push({ text: "", func: "" });
    newScenes[sceneIndex].lines[lineIndex].noChoice = false;
    setScenes(newScenes);
  };

  const deleteChoice = (sceneIndex, lineIndex, choiceIndex) => {
    const newScenes = [...scenes];
    newScenes[sceneIndex].lines[lineIndex].choices.splice(choiceIndex, 1);
    
    // 모든 선택지를 삭제한 경우, noChoice를 true로 설정
    if (newScenes[sceneIndex].lines[lineIndex].choices.length === 0) {
      newScenes[sceneIndex].lines[lineIndex].noChoice = true;
    }
    
    setScenes(newScenes);
  };

  const toggleCollapse = (sceneIndex) => {
    const newScenes = [...scenes];
    newScenes[sceneIndex].collapsed = !newScenes[sceneIndex].collapsed;
    setScenes(newScenes);
  };

  const exportXML = () => {
    const xml = scenes
      .map((scene) => {
        // 씬의 대사 갯수를 맨 앞에 추가
        const linesCount = scene.lines.length;
        const linesXml = scene.lines
          .map((line, i) => {
            let choicesXml;
            if (line.noChoice) {
              choicesXml = "";
            } else {
              // 선택지 갯수 태그 추가
              const choicesCount = line.choices.length;
              choicesXml = `<n>${choicesCount}</n>` + 
                line.choices
                  .map((c, choiceIndex) => `<ch${choiceIndex + 1}><chCont>${c.text}</chCont><func>${c.func}</func></ch${choiceIndex + 1}>`)
                  .join("");
            }
  
            // 기분이 비어있으면 "기본"으로 설정
            const mood = line.mood.trim() || "기본";
  
            return `<${i + 1}><name>${line.name}</name><mood>${mood}</mood><talkCont>${line.content}</talkCont><func>${line.func}</func><chs>${choicesXml}</chs></${i + 1}>`;
          })
          .join("");
  
        // 씬의 대사 갯수를 맨 앞에 추가하여 반환
        return `<n>${linesCount}</n>${linesXml}`;
      })
      .join("\n"); // 씬 사이에 단순 줄바꿈
  
    console.log(xml);
    alert("콘솔에 XML이 출력되었어요!");
  };



  // 데이터를 JSON 파일로 내보내기
  const exportToFile = () => {
    const data = JSON.stringify(scenes, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `story_editor_data_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 파일에서 데이터 불러오기
  const importFromFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setScenes(data);
        
        // 로컬 스토리지도 업데이트
        const timestamp = new Date().toLocaleString();
        localStorage.setItem("storyEditorData", JSON.stringify({
          scenes: data,
          timestamp
        }));
        setLastSaved(timestamp);
        
        alert("파일에서 데이터를 성공적으로 불러왔습니다!");
      } catch (error) {
        console.error("파일을 불러오는 중 오류가 발생했습니다:", error);
        alert("파일 형식이 올바르지 않습니다. 유효한 JSON 파일을 선택해주세요.");
      }
    };
    reader.readAsText(file);
    
    // 파일 선택 input을 초기화하여 같은 파일을 다시 선택할 수 있게 함
    event.target.value = null;
  };

  // 로컬 스토리지 데이터 삭제 (초기화)
  const clearStoredData = () => {
    if (window.confirm("정말로 모든 저장된 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      localStorage.removeItem("storyEditorData");
      setScenes([]);
      setLastSaved(null);
      alert("모든 데이터가 삭제되었습니다.");
    }
  };

  // 씬 이름 편집 모드 시작
  const startEditingSceneName = (sceneIndex) => {
    setEditingSceneName(sceneIndex);
    // 다음 렌더링 후 포커스 설정을 위한 타임아웃
    setTimeout(() => {
      if (sceneNameInputRef.current) {
        sceneNameInputRef.current.focus();
      }
    }, 0);
  };

  // Enter 키 눌렀을 때 편집 모드 종료
  const handleSceneNameKeyDown = (e, sceneIndex) => {
    if (e.key === "Enter") {
      setEditingSceneName(null);
    }
    handleKeyDown(e, sceneIndex, -1);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">스토리 에디터</h1>
        <div className="action-buttons">
          <button onClick={addScene} className="primary-button">
            + 씬 추가
          </button>
          <button onClick={exportXML} className="primary-button export">
            📄 XML Export
          </button>
          <div className="file-buttons">
            <button onClick={exportToFile} className="secondary-button">
              💾 파일로 저장
            </button>
            <label className="file-input-label">
              📂 파일에서 불러오기
              <input 
                type="file" 
                accept=".json" 
                onChange={importFromFile} 
                className="file-input" 
              />
            </label>
            <button onClick={clearStoredData} className="danger-button">
              🗑️ 초기화
            </button>
          </div>
        </div>
      </header>
      
      <div className="shortcuts-info">
        <div>
          <strong>단축키:</strong> Ctrl + Enter = 현재 위치 아래에 새 대사 추가 (모든 입력 필드에서 작동)
        </div>
        {lastSaved && (
          <div className="autosave-info">
            마지막 자동 저장: {lastSaved}
          </div>
        )}
      </div>
      
      {scenes.map((scene, sceneIndex) => (
        <div key={scene.id} className="scene-container">
          <div className="scene-header">
            {editingSceneName === sceneIndex ? (
              <input
                ref={sceneNameInputRef}
                placeholder="씬 이름 (내부 참고용)"
                value={scene.name}
                onChange={(e) => updateScene(sceneIndex, "name", e.target.value)}
                onKeyDown={(e) => handleSceneNameKeyDown(e, sceneIndex)}
                onBlur={() => setEditingSceneName(null)}
                className="scene-name-input"
              />
            ) : (
              <div 
                className="scene-name-display" 
                onClick={() => startEditingSceneName(sceneIndex)}
              >
                {scene.name || "제목 없음"}
              </div>
            )}
            <div className="scene-controls">
              <span className="scene-number">
                씬 {scene.id}
              </span>
              <button 
                onClick={() => toggleCollapse(sceneIndex)} 
                className="collapse-button"
              >
                {scene.collapsed ? "▶" : "▼"}
              </button>
              <button 
                onClick={() => deleteScene(sceneIndex)}
                className="delete-button"
                title="씬 삭제"
              >
                ×
              </button>
            </div>
          </div>

          {!scene.collapsed && (
            <div className="scene-content">
              {scene.lines.map((line, lineIndex) => (
                <div key={lineIndex} className="line-container">
                  <div className="line-header">
                    <span className="line-number">대사 {lineIndex + 1}</span>
                    <button 
                      onClick={() => deleteLine(sceneIndex, lineIndex)}
                      className="delete-button"
                      title="대사 삭제"
                    >
                      ×
                    </button>
                  </div>
                  <div className="line-inputs">
                    <input
                      placeholder="이름"
                      value={line.name}
                      onChange={(e) => updateLine(sceneIndex, lineIndex, "name", e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, sceneIndex, lineIndex)}
                      className="name-input"
                    />
                    <input
                      placeholder="기분 (빈칸=기본)"
                      value={line.mood}
                      onChange={(e) => updateLine(sceneIndex, lineIndex, "mood", e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, sceneIndex, lineIndex)}
                      className="mood-input"
                    />
                    <input
                      placeholder="내용"
                      value={line.content}
                      onChange={(e) => updateLine(sceneIndex, lineIndex, "content", e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, sceneIndex, lineIndex)}
                      className="content-input"
                    />
                    <input
                      placeholder="함수 번호"
                      value={line.func}
                      onChange={(e) => updateLine(sceneIndex, lineIndex, "func", e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, sceneIndex, lineIndex)}
                      className="func-input"
                    />
                  </div>
                  <div className="choices-section">
                    <label className="no-choice-label">
                      <input
                        type="checkbox"
                        checked={line.noChoice}
                        onChange={(e) => {
                          const newScenes = [...scenes];
                          newScenes[sceneIndex].lines[lineIndex].noChoice = e.target.checked;
                          if (e.target.checked) newScenes[sceneIndex].lines[lineIndex].choices = [];
                          setScenes(newScenes);
                        }}
                        className="no-choice-checkbox"
                      />
                      선택지 없음
                    </label>
                    {!line.noChoice && (
                      <div className="choices-container">
                        {line.choices.map((choice, choiceIndex) => (
                          <div key={choiceIndex} className="choice-row">
                            <input
                              placeholder="선택지 텍스트"
                              value={choice.text}
                              onChange={(e) =>
                                updateChoice(sceneIndex, lineIndex, choiceIndex, "text", e.target.value)
                              }
                              onKeyDown={(e) => handleKeyDown(e, sceneIndex, lineIndex)}
                              className="choice-text-input"
                            />
                            <input
                              placeholder="함수 번호"
                              value={choice.func}
                              onChange={(e) =>
                                updateChoice(sceneIndex, lineIndex, choiceIndex, "func", e.target.value)
                              }
                              onKeyDown={(e) => handleKeyDown(e, sceneIndex, lineIndex)}
                              className="choice-func-input"
                            />
                            <button
                              onClick={() => deleteChoice(sceneIndex, lineIndex, choiceIndex)}
                              className="delete-choice-button hover-delete-button"
                              title="선택지 삭제"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => addChoice(sceneIndex, lineIndex)}
                          className="add-button"
                        >
                          + 선택지 추가
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button 
                onClick={() => addLine(sceneIndex)}
                className="add-line-button"
              >
                + 대사 추가
              </button>
            </div>
          )}
        </div>
      ))}
      
      {scenes.length === 0 && (
        <div className="empty-state">
          <p>아직 씬이 없습니다. '씬 추가' 버튼을 클릭하여 시작하세요.</p>
        </div>
      )}
    </div>
  );
}

export default App;