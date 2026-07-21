import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WorkListPage.css";

function WorkListPage() {
  const navigate = useNavigate();

  const [works, setWorks] = useState([
    {
      id: 1,
      title: "청자 매병 복원",
      date: "2026.07.18",
      status: "진행 중",
      favorite: true,
    },
    {
      id: 2,
      title: "청동 거울 복원",
      date: "2026.07.15",
      status: "전문가 검토",
      favorite: false,
    },
    {
      id: 3,
      title: "토기 파편 복원",
      date: "2026.07.10",
      status: "완료",
      favorite: false,
    },
  ]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("latest");

  const getStatusClass = (status) => {
    switch (status) {
      case "진행 중":
        return "progress";
      case "완료":
        return "done";
      case "전문가 검토":
        return "review";
      default:
        return "";
    }
  };

  const filteredWorks = useMemo(() => {
    let result = [...works];

    result = result.filter((work) =>
      work.title.toLowerCase().includes(search.toLowerCase())
    );

    if (filter === "favorite") {
      result = result.filter((work) => work.favorite);
    }

    result.sort((a, b) => b.id - a.id);

    return result;
  }, [works, search, filter]);

  // ⭐ 즐겨찾기
  const toggleFavorite = (id) => {
    setWorks((prev) =>
      prev.map((work) =>
        work.id === id
          ? {
              ...work,
              favorite: !work.favorite,
            }
          : work
      )
    );
  };

  // ✏️ 수정
  const editProject = (id) => {
    const work = works.find((w) => w.id === id);

    const newTitle = prompt(
      "프로젝트명을 입력하세요.",
      work.title
    );

    if (!newTitle || !newTitle.trim()) return;

    setWorks((prev) =>
      prev.map((work) =>
        work.id === id
          ? {
              ...work,
              title: newTitle,
            }
          : work
      )
    );
  };

  // 🗑️ 삭제
  const deleteProject = (id) => {
    if (window.confirm("프로젝트를 삭제하시겠습니까?")) {
      setWorks((prev) =>
        prev.filter((work) => work.id !== id)
      );
    }
  };

  return (
    <div className="worklist-page">
      <header className="worklist-header">
        <div
          className="worklist-logo"
          onClick={() => navigate("/")}
        >
          VORA
        </div>

        <div className="worklist-profile">
          👤
        </div>
      </header>

      <h1 className="worklist-title">
        작업 목록
      </h1>

      <div className="worklist-search">

        <input
          type="text"
          placeholder="프로젝트 검색"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value)
          }
        >
          <option value="latest">
            최신순
          </option>

          <option value="favorite">
            즐겨찾기만 보기
          </option>

        </select>

        <button
          className="add-btn"
          onClick={() =>
            navigate("/artifact-register")
          }
        >
          + 새 프로젝트
        </button>

      </div>

      <p className="work-count">
        총 {filteredWorks.length}개의 프로젝트
      </p>

      <div className="work-grid">

        {filteredWorks.map((work) => (
                    <div
            key={work.id}
            className="work-card"
          >
            <div className="card-top">

              <div className="artifact-thumb">
                🏺
              </div>

              <div className="card-info">

                <h3>{work.title}</h3>

                <span
                  className={`status-badge ${getStatusClass(
                    work.status
                  )}`}
                >
                  {work.status}
                </span>

                <p>
                  마지막 수정 : {work.date}
                </p>

              </div>

              <div className="card-buttons">

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(work.id);
                  }}
                >
                  {work.favorite ? "⭐" : "☆"}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    editProject(work.id);
                  }}
                >
                  ✏️
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject(work.id);
                  }}
                >
                  🗑️
                </button>

              </div>

            </div>

            <div className="card-footer">

              <button
                className="open-btn"
                onClick={() =>
                  navigate(`/project/${work.id}`)
                }
              >
                프로젝트 열기 →
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}

export default WorkListPage;