const DEFAULT_MAP = {
  title: "",
  logline: "로그라인을 적으세요.",
  nodes: [],
};

const CARD_WIDTH = 220;
const CARD_HEIGHT = 126;
const TITLE_MAX_LENGTH = 35;
const SUMMARY_MAX_LENGTH = 40;
const LOGLINE_MAX_LENGTH = 200;
const SHARE_API_BASE = "/api/maps";
const HANDLE_CENTER_OFFSET = 0;
const HANDLE_STEM_LENGTH = 18;
const ARROW_TIP_OFFSET = 0;
const NEW_SCENE_GAP = 60;
const PREVIEW_EDITOR_HISTORY_LIMIT = 200;

function deepClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function createNodeKey() {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSummary(value) {
  return String(value || "").trim().slice(0, SUMMARY_MAX_LENGTH);
}

function normalizeTitle(value) {
  return String(value || "").trim().slice(0, TITLE_MAX_LENGTH);
}

function normalizeSceneId(value, fallback = "") {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(/^(?:scene-)?(\d+)([A-Za-z]?)$/);
  if (!match) {
    return fallback;
  }

  return `scene-${match[1]}${(match[2] || "").toUpperCase()}`;
}
const SAMPLE_MAP = {
  title: "샘플 스토리 맵",
  logline:
    "주인공이 실종된 언니의 흔적을 좇다가, 두 개의 선택 앞에서 전혀 다른 진실에 닿는 미스터리 드라마.",
  nodes: [
    {
      sceneId: "scene-1",
      id: "scene-1",
      title: "윤서 집/N",
      summary: "주인공 윤서가 언니의 음성 메시지를 발견한다.",
      detail:
        "새벽, 윤서는 지워진 줄 알았던 언니의 음성 메시지를 다시 듣는다. 메시지에는 '절대 역으로 오지 마'라는 경고와 함께 정체불명의 기계음이 섞여 있다.",
      x: 100,
      y: 300,
      nextIds: ["scene-2"],
    },
    {
      sceneId: "scene-2",
      id: "scene-2",
      title: "폐창고/N",
      summary: "폐쇄된 역 창고에서 언니의 목걸이를 발견한다.",
      detail:
        "윤서는 경비의 눈을 피해 폐쇄된 창고에 들어가고, 오래된 사물함 안에서 언니의 목걸이와 같은 문양이 찍힌 메모 조각을 찾는다.",
      x: 420,
      y: 300,
      nextIds: ["scene-3", "scene-4"],
    },
    {
      sceneId: "scene-3A",
      id: "scene-3",
      title: "경찰서/D",
      summary: "공식 도움을 요청하지만 조사가 지연된다.",
      detail:
        "윤서는 형사 민우에게 단서를 넘기지만, 민우는 증거가 약하다며 절차를 우선한다. 윤서는 시간이 없다는 압박을 느낀다.",
      x: 780,
      y: 210,
      nextIds: ["scene-5"],
    },
    {
      sceneId: "scene-3B",
      id: "scene-4",
      title: "피씨방/D",
      summary: "비밀 채팅방에 잠입해 더 위험한 단서를 얻는다.",
      detail:
        "윤서는 언니가 사용하던 가짜 계정으로 비밀 채팅방에 접속한다. 그곳에서 '오늘 밤 마지막 열차'라는 문장을 보고 직접 움직이기로 결심한다.",
      x: 780,
      y: 430,
      nextIds: ["scene-5"],
    },
    {
      sceneId: "scene-4",
      id: "scene-5",
      title: "플랫폼/N",
      summary: "플랫폼 아래 비밀 통로에서 진실의 입구를 찾는다.",
      detail:
        "다른 경로를 거쳤더라도 윤서는 결국 마지막 열차 플랫폼 아래 숨겨진 통로 앞에 도착한다. 이제 언니가 남긴 흔적이 단순 실종 사건이 아니었다는 사실이 드러난다.",
      x: 1140,
      y: 320,
      nextIds: ["scene-6"],
    },
    {
      sceneId: "scene-5",
      id: "scene-6",
      title: "감시실/N",
      summary: "언니가 도망친 것이 아니라 누군가를 지키고 있었다는 사실이 밝혀진다.",
      detail:
        "통로 끝 감시실에서 윤서는 언니의 영상을 본다. 언니는 자신이 쫓기는 피해자가 아니라, 더 큰 사건의 증인을 숨기기 위해 일부러 사라졌음을 고백한다.",
      x: 1500,
      y: 320,
      nextIds: [],
    },
  ],
};

const state = {
  map: deepClone(DEFAULT_MAP),
  shareId: null,
  selectedNodeId: null,
  lastSelectedNodeId: null,
  mergeSourceNodeId: null,
  previewNodeId: null,
  contextMenuNodeId: null,
  editingSceneIdNodeId: null,
  lastCardClick: null,
  hoverTipTimeoutId: null,
  history: [],
  future: [],
  connectionDrag: null,
  previewEditor: {
    activeFieldKey: null,
    fields: {},
  },
};

const elements = {
  storyTitle: document.getElementById("story-title"),
  storyLogline: document.getElementById("story-logline"),
  saveOnlineBtn: document.getElementById("save-online-btn"),
  shareLinkBtn: document.getElementById("share-link-btn"),
  shareStatus: document.getElementById("share-status"),
  selectedNodeIndicator: document.getElementById("selected-node-indicator"),
  sceneHoverTip: document.getElementById("scene-hover-tip"),
  nodeLayer: document.getElementById("node-layer"),
  edgeLayer: document.getElementById("edge-layer"),
  emptyState: document.getElementById("empty-state"),
  emptyAddSceneBtn: document.getElementById("empty-add-scene-btn"),
  sceneContextMenu: document.getElementById("scene-context-menu"),
  contextAddScene: document.getElementById("context-add-scene"),
  contextDeleteScene: document.getElementById("context-delete-scene"),
  contextToggleImportant: document.getElementById("context-toggle-important"),
  exportContextMenu: document.getElementById("export-context-menu"),
  exportHoverTip: document.getElementById("export-hover-tip"),
  contextExportMap: document.getElementById("context-export-map"),
  contextExportSceneList: document.getElementById("context-export-scene-list"),
  contextExportScenario: document.getElementById("context-export-scenario"),
  contextExportMd: document.getElementById("context-export-md"),
  scenePreviewOverlay: document.getElementById("scene-preview-overlay"),
  scenePreviewBackdrop: document.getElementById("scene-preview-backdrop"),
  scenePreviewClose: document.getElementById("scene-preview-close"),
  scenePreviewId: document.getElementById("scene-preview-id"),
  scenePreviewTitleInput: document.getElementById("scene-preview-title-input"),
  scenePreviewSummaryInput: document.getElementById("scene-preview-summary-input"),
  scenePreviewDetailInput: document.getElementById("scene-preview-detail-input"),
  scenePreviewSave: document.getElementById("scene-preview-save"),
  scenePreviewUndo: document.getElementById("scene-preview-undo"),
  scenePreviewRedo: document.getElementById("scene-preview-redo"),
  newMapBtn: document.getElementById("new-map-btn"),
  undoBtn: document.getElementById("undo-btn"),
  redoBtn: document.getElementById("redo-btn"),
  exportBtn: document.getElementById("export-btn"),
  importInput: document.getElementById("import-input"),
};

function snapshotState() {
  return {
    map: deepClone(state.map),
    shareId: state.shareId,
    selectedNodeId: state.selectedNodeId,
    lastSelectedNodeId: state.lastSelectedNodeId,
    mergeSourceNodeId: state.mergeSourceNodeId,
    previewNodeId: state.previewNodeId,
    contextMenuNodeId: state.contextMenuNodeId,
  };
}

function pushHistory() {
  state.history.push(snapshotState());
  if (state.history.length > 100) {
    state.history.shift();
  }
  state.future = [];
}

function undoLastAction() {
  const previous = state.history.pop();
  if (!previous) {
    return;
  }

  state.future.push(snapshotState());
  if (state.future.length > 100) {
    state.future.shift();
  }
  state.map = previous.map;
  state.shareId = previous.shareId ?? null;
  state.selectedNodeId = previous.selectedNodeId;
  state.lastSelectedNodeId = previous.lastSelectedNodeId;
  state.mergeSourceNodeId = previous.mergeSourceNodeId;
  state.previewNodeId = previous.previewNodeId;
  state.contextMenuNodeId = previous.contextMenuNodeId;
  rerenderAll();
}

function redoLastAction() {
  const next = state.future.pop();
  if (!next) {
    return;
  }

  state.history.push(snapshotState());
  if (state.history.length > 100) {
    state.history.shift();
  }
  state.map = next.map;
  state.shareId = next.shareId ?? null;
  state.selectedNodeId = next.selectedNodeId;
  state.lastSelectedNodeId = next.lastSelectedNodeId;
  state.mergeSourceNodeId = next.mergeSourceNodeId;
  state.previewNodeId = next.previewNodeId;
  state.contextMenuNodeId = next.contextMenuNodeId;
  rerenderAll();
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "") || `scene-${Date.now()}`;
}

function getSelectedNode() {
  return state.map.nodes.find((node) => node.key === state.selectedNodeId) || null;
}

function ensureNextIds(node) {
  return Array.isArray(node.nextIds) ? node.nextIds.filter(Boolean) : [];
}

function normalizeLogline(value) {
  const trimmed = String(value || "").replace(/\r/g, "").slice(0, LOGLINE_MAX_LENGTH);
  return trimmed
    .split("\n")
    .slice(0, 2)
    .join("\n");
}

function isWebSaveAvailable() {
  return window.location.protocol.startsWith("http");
}

function setShareStatus(message, tone = "default") {
  if (!elements.shareStatus) {
    return;
  }
  elements.shareStatus.textContent = message || "";
  elements.shareStatus.dataset.tone = tone;
}

function getShareUrl(shareId = state.shareId) {
  if (!shareId || !window.location.origin) {
    return "";
  }
  const url = new URL(window.location.href);
  url.searchParams.set("share", shareId);
  return url.toString();
}

function updateShareControls() {
  const available = isWebSaveAvailable();
  if (elements.saveOnlineBtn) {
    elements.saveOnlineBtn.disabled = !available;
  }
  if (elements.shareLinkBtn) {
    elements.shareLinkBtn.disabled = !available;
  }
  if (!available) {
    setShareStatus("웹 저장/공유는 서버로 열었을 때 사용할 수 있습니다.");
    return;
  }
  if (state.shareId) {
    setShareStatus(`공유 ID: ${state.shareId}`);
  } else {
    setShareStatus("아직 웹 저장되지 않았습니다.");
  }
}

function fitLoglineToField(value) {
  const field = elements.storyLogline;
  let candidate = normalizeLogline(value);
  field.value = candidate;

  while (candidate && field.scrollHeight > field.clientHeight + 6) {
    candidate = candidate.slice(0, -1);
    field.value = candidate;
  }

  return candidate;
}

function syncMapMetaInputs() {
  if (document.activeElement !== elements.storyTitle) {
    elements.storyTitle.value = state.map.title || "";
  }
  if (document.activeElement !== elements.storyLogline) {
    const fitted = fitLoglineToField(state.map.logline || "");
    if (state.map.logline !== fitted) {
      state.map.logline = fitted;
    }
  }
  const selectedNode = getSelectedNode();
  if (elements.selectedNodeIndicator) {
    elements.selectedNodeIndicator.textContent = selectedNode
      ? `현재 기준 장면: ${selectedNode.title || selectedNode.sceneId}`
      : "현재 기준 장면: 선택되지 않음";
  }
  elements.undoBtn.disabled = state.history.length === 0;
  elements.redoBtn.disabled = state.future.length === 0;
  updateShareControls();
}

function openSceneIdEditor(nodeId) {
  state.editingSceneIdNodeId = nodeId;
  renderMap();

  window.requestAnimationFrame(() => {
    const input = elements.nodeLayer.querySelector(`[data-scene-id-input-for="${CSS.escape(nodeId)}"]`);
    if (!input) {
      return;
    }
    input.focus();
    input.select();
  });
}

function closeSceneIdEditor() {
  state.editingSceneIdNodeId = null;
}

function commitSceneIdEdit(nodeId, nextValue) {
  const node = getNodeById(nodeId);
  if (!node) {
    closeSceneIdEditor();
    rerenderAll();
    return;
  }

  const normalized = normalizeSceneId(nextValue, node.sceneId);
  closeSceneIdEditor();

  if (!normalized || normalized === node.sceneId) {
    rerenderAll();
    return;
  }

  pushHistory();
  const didRenumber = renumberSceneIdsFromNode(nodeId, normalized);
  if (!didRenumber) {
    node.sceneId = normalized;
  }
  rerenderAll();
}

function renderMap() {
  elements.nodeLayer.innerHTML = "";

  const hasNodes = state.map.nodes.length > 0;
  elements.emptyState.hidden = hasNodes;

  if (!hasNodes) {
    elements.edgeLayer.innerHTML = "";
    return;
  }

  let maxX = 1400;
  let maxY = 900;

  state.map.nodes.forEach((node) => {
    const card = document.createElement("article");
    card.className = "scene-card";
    card.dataset.nodeId = node.key;
    if (node.key === state.selectedNodeId) {
      card.classList.add("active");
    }
    card.style.left = `${node.x}px`;
    card.style.top = `${node.y}px`;
    const isEditingSceneId = state.editingSceneIdNodeId === node.key;
    card.innerHTML = `
      ${node.important ? '<span class="scene-important-star" aria-label="중요 장면" title="중요 장면">★</span>' : ""}
      ${
        isEditingSceneId
          ? `<input
              type="text"
              class="scene-badge scene-id-inline-input"
              data-scene-id-input-for="${escapeHtml(node.key)}"
              value="${escapeHtml(node.sceneId || "")}"
              aria-label="scene id 수정"
            >`
          : `<button type="button" class="scene-badge scene-id-edit-trigger" data-scene-id-trigger="${escapeHtml(node.key)}" title="scene id 수정">${escapeHtml(node.sceneId || "")}</button>`
      }
      <h3 title="${escapeHtml(node.title || "씬의 정보")}">${escapeHtml(normalizeTitle(node.title) || "씬의 정보")}</h3>
      <p>${escapeHtml(normalizeSummary(node.summary) || "요약 없음")}</p>
      <button type="button" class="connection-handle" data-action="connect" title="이 장면의 연결선을 드래그해서 다른 장면에 붙이기"></button>
    `;
    const sceneIdTrigger = card.querySelector("[data-scene-id-trigger]");
    if (sceneIdTrigger) {
      sceneIdTrigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectNode(node.key);
        openSceneIdEditor(node.key);
      });
    }
    const sceneIdInput = card.querySelector("[data-scene-id-input-for]");
    if (sceneIdInput) {
      sceneIdInput.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      sceneIdInput.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      sceneIdInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitSceneIdEdit(node.key, sceneIdInput.value);
        }
        if (event.key === "Escape") {
          event.preventDefault();
          closeSceneIdEditor();
          rerenderAll();
        }
      });
      sceneIdInput.addEventListener("blur", () => {
        commitSceneIdEdit(node.key, sceneIdInput.value);
      });
    }
    const connectHandle = card.querySelector('[data-action="connect"]');
    connectHandle.addEventListener("pointerdown", (event) => {
      startNewConnectionDrag(event, node.key);
    });
    card.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectNode(node.key);
      openSceneContextMenu(event.clientX, event.clientY, node.key);
    });
    card.addEventListener("mouseenter", () => {
      if (node.key === state.selectedNodeId) {
        showSceneHoverTip(card);
      }
    });
    enableDragging(card, node);
    elements.nodeLayer.appendChild(card);

    maxX = Math.max(maxX, node.x + CARD_WIDTH + 120);
    maxY = Math.max(maxY, node.y + CARD_HEIGHT + 120);
  });

  elements.nodeLayer.style.width = `${maxX}px`;
  elements.nodeLayer.style.height = `${maxY}px`;
  elements.edgeLayer.setAttribute("width", String(maxX));
  elements.edgeLayer.setAttribute("height", String(maxY));
  elements.edgeLayer.setAttribute("viewBox", `0 0 ${maxX} ${maxY}`);

  renderEdges();
}

function renderEdges() {
  elements.edgeLayer.innerHTML = "";

  state.map.nodes.forEach((node) => {
    const nextIds = ensureNextIds(node);
    nextIds.forEach((nextId, index) => {
      const nextNode = state.map.nodes.find((candidate) => candidate.key === nextId);
      if (!nextNode) {
        return;
      }

      const geometry = buildEdgeGeometry(node, nextNode, index, nextIds.length);
      const {
        startX,
        startY,
        endX,
        endY,
        control1X,
        control1Y,
        control2X,
        control2Y,
        arrowPoints,
      } = geometry;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const pathData =
        `M ${startX} ${startY} C ${control1X} ${control1Y}, ` +
        `${control2X} ${control2Y}, ${endX} ${endY}`;
      path.setAttribute(
        "d",
        pathData
      );
      path.setAttribute("class", "edge-path");
      elements.edgeLayer.appendChild(path);

      const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hitArea.setAttribute("d", pathData);
      hitArea.setAttribute("class", "edge-hit-area");
      hitArea.dataset.sourceNodeId = node.key;
      hitArea.dataset.targetNodeId = nextId;
      hitArea.addEventListener("pointerdown", (event) => {
        startConnectionDrag(event, node.key, nextId);
      });
      elements.edgeLayer.appendChild(hitArea);

      const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      arrow.setAttribute("points", arrowPoints);
      arrow.setAttribute("fill", "rgba(31, 47, 55, 0.96)");
      arrow.setAttribute("class", "edge-arrow");
      arrow.dataset.sourceNodeId = node.key;
      arrow.dataset.targetNodeId = nextId;
      arrow.addEventListener("pointerdown", (event) => {
        startConnectionDrag(event, node.key, nextId);
      });
      elements.edgeLayer.appendChild(arrow);
    });
  });

  renderTemporaryEdge();
}

function getRenderedNodeMetrics(node) {
  const fallback = {
    x: node.x,
    y: node.y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  };
  const card = elements.nodeLayer.querySelector(`[data-node-id="${CSS.escape(node.key)}"]`);
  if (!card) {
    return fallback;
  }

  return {
    x: node.x,
    y: node.y,
    width: card.offsetWidth || CARD_WIDTH,
    height: card.offsetHeight || CARD_HEIGHT,
  };
}

function buildEdgeGeometry(sourceNode, targetNode, index, siblingCount) {
  const sourceMetrics = getRenderedNodeMetrics(sourceNode);
  const targetMetrics = getRenderedNodeMetrics(targetNode);
  const handleCenterX = sourceMetrics.x + sourceMetrics.width + HANDLE_CENTER_OFFSET;
  const handleCenterY = sourceMetrics.y + sourceMetrics.height / 2;
  const startX = handleCenterX;
  const startY = handleCenterY;
  const targetAnchor = getCardIntersectionPoint(
    startX,
    startY,
    targetMetrics,
    ARROW_TIP_OFFSET
  );
  const endX = targetAnchor.x;
  const endY = targetAnchor.y;
  const dx = endX - startX;
  const dy = endY - startY;
  const branchOffset = siblingCount > 1 ? (index - (siblingCount - 1) / 2) * 44 : 0;
  const horizontalPull = Math.max(70, Math.min(190, Math.abs(dx) * 0.45));
  const verticalPull = Math.max(18, Math.min(120, Math.abs(dy) * 0.35));

  let control1X;
  let control1Y;
  let control2X;
  let control2Y;

  if (dx >= 0) {
    control1X = startX + HANDLE_STEM_LENGTH;
    control1Y = startY;
      control2X = endX - horizontalPull;
      control2Y = endY - branchOffset;
  } else {
    control1X = startX + HANDLE_STEM_LENGTH;
    control1Y = startY;
      control2X = endX + horizontalPull;
      control2Y = endY - branchOffset - Math.sign(dy || 1) * verticalPull;
  }

  if (Math.abs(dx) < 80) {
    control1X = startX + HANDLE_STEM_LENGTH;
    control1Y = startY;
    control2X = endX - horizontalPull;
    control2Y = endY;
  }

  const tangentX = endX - control2X;
  const tangentY = endY - control2Y;

  return {
    startX,
    startY,
    endX,
    endY,
    control1X,
    control1Y,
    control2X,
    control2Y,
    arrowPoints: buildArrowPoints(endX, endY, tangentX, tangentY),
  };
}

function getCardIntersectionPoint(fromX, fromY, metrics, offset = 0) {
  const centerX = metrics.x + metrics.width / 2;
  const centerY = metrics.y + metrics.height / 2;
  const dx = fromX - centerX;
  const dy = fromY - centerY;

  if (dx === 0 && dy === 0) {
    return { x: metrics.x, y: centerY };
  }

  const scale = Math.max(
    Math.abs(dx) / (metrics.width / 2),
    Math.abs(dy) / (metrics.height / 2)
  );

  const edgeX = centerX + dx / scale;
  const edgeY = centerY + dy / scale;
  const length = Math.hypot(dx, dy) || 1;
  const unitX = dx / length;
  const unitY = dy / length;

  return {
    x: edgeX + unitX * offset,
    y: edgeY + unitY * offset,
  };
}

function buildArrowPoints(tipX, tipY, vectorX, vectorY) {
  const length = Math.hypot(vectorX, vectorY) || 1;
  const unitX = vectorX / length;
  const unitY = vectorY / length;
  const size = 18;
  const baseX = tipX - unitX * size;
  const baseY = tipY - unitY * size;
  const perpX = -unitY;
  const perpY = unitX;
  const wing = 9;

  const leftX = baseX + perpX * wing;
  const leftY = baseY + perpY * wing;
  const rightX = baseX - perpX * wing;
  const rightY = baseY - perpY * wing;

  return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`;
}

function renderTemporaryEdge() {
  if (!state.connectionDrag) {
    return;
  }

  const sourceNode = getNodeById(state.connectionDrag.sourceNodeId);
  if (!sourceNode) {
    return;
  }

  const sourceMetrics = getRenderedNodeMetrics(sourceNode);
  const startX = sourceMetrics.x + sourceMetrics.width + HANDLE_CENTER_OFFSET;
  const startY = sourceMetrics.y + sourceMetrics.height / 2;
  const endX = state.connectionDrag.pointerX;
  const endY = state.connectionDrag.pointerY;
  const dx = endX - startX;
  const horizontalPull = Math.max(70, Math.min(190, Math.abs(dx) * 0.45));
  const control1X = startX + HANDLE_STEM_LENGTH;
  const control2X = dx >= 0 ? endX - horizontalPull : endX + horizontalPull;

  const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  tempPath.setAttribute(
    "d",
    `M ${startX} ${startY} C ${control1X} ${startY}, ${control2X} ${endY}, ${endX} ${endY}`
  );
  tempPath.setAttribute("class", "temporary-edge");
  elements.edgeLayer.appendChild(tempPath);
}

function startConnectionDrag(event, sourceNodeId, currentTargetNodeId) {
  event.preventDefault();
  event.stopPropagation();

  const mapRect = elements.nodeLayer.getBoundingClientRect();
  state.connectionDrag = {
    sourceNodeId,
    currentTargetNodeId,
    pointerX: event.clientX - mapRect.left,
    pointerY: event.clientY - mapRect.top,
  };
  renderEdges();

  const onPointerMove = (moveEvent) => {
    const liveRect = elements.nodeLayer.getBoundingClientRect();
    state.connectionDrag.pointerX = moveEvent.clientX - liveRect.left;
    state.connectionDrag.pointerY = moveEvent.clientY - liveRect.top;
    highlightDropTarget(moveEvent.clientX, moveEvent.clientY, sourceNodeId);
    renderEdges();
  };

  const onPointerUp = (upEvent) => {
    finishConnectionDrag(upEvent.clientX, upEvent.clientY);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}

function startNewConnectionDrag(event, sourceNodeId) {
  event.preventDefault();
  event.stopPropagation();

  const mapRect = elements.nodeLayer.getBoundingClientRect();
  state.connectionDrag = {
    sourceNodeId,
    currentTargetNodeId: null,
    pointerX: event.clientX - mapRect.left,
    pointerY: event.clientY - mapRect.top,
  };
  renderEdges();

  const onPointerMove = (moveEvent) => {
    const liveRect = elements.nodeLayer.getBoundingClientRect();
    state.connectionDrag.pointerX = moveEvent.clientX - liveRect.left;
    state.connectionDrag.pointerY = moveEvent.clientY - liveRect.top;
    highlightDropTarget(moveEvent.clientX, moveEvent.clientY, sourceNodeId);
    renderEdges();
  };

  const onPointerUp = (upEvent) => {
    finishNewConnectionDrag(upEvent.clientX, upEvent.clientY);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}

function highlightDropTarget(clientX, clientY, sourceNodeId) {
  document.querySelectorAll(".scene-card.drop-target").forEach((card) => {
    card.classList.remove("drop-target");
  });

  const targetCard = getCardAtPoint(clientX, clientY);
  if (!targetCard) {
    return;
  }

  if (targetCard.dataset.nodeId === sourceNodeId) {
    return;
  }

  targetCard.classList.add("drop-target");
}

function finishConnectionDrag(clientX, clientY) {
  const targetCard = getCardAtPoint(clientX, clientY);
  const dragState = state.connectionDrag;
  state.connectionDrag = null;
  document.querySelectorAll(".scene-card.drop-target").forEach((card) => {
    card.classList.remove("drop-target");
  });

  if (!dragState || !targetCard) {
    renderEdges();
    return;
  }

  const newTargetNodeId = targetCard.dataset.nodeId;
  if (!newTargetNodeId || newTargetNodeId === dragState.sourceNodeId) {
    renderEdges();
    return;
  }

  reconnectEdge(dragState.sourceNodeId, dragState.currentTargetNodeId, newTargetNodeId);
}

function finishNewConnectionDrag(clientX, clientY) {
  const targetCard = getCardAtPoint(clientX, clientY);
  const dragState = state.connectionDrag;
  state.connectionDrag = null;
  document.querySelectorAll(".scene-card.drop-target").forEach((card) => {
    card.classList.remove("drop-target");
  });

  if (!dragState || !targetCard) {
    renderEdges();
    return;
  }

  const newTargetNodeId = targetCard.dataset.nodeId;
  if (!newTargetNodeId || newTargetNodeId === dragState.sourceNodeId) {
    renderEdges();
    return;
  }

  connectNodes(dragState.sourceNodeId, newTargetNodeId);
}

function reconnectEdge(sourceNodeId, oldTargetNodeId, newTargetNodeId) {
  const sourceNode = getNodeById(sourceNodeId);
  if (!sourceNode) {
    renderEdges();
    return;
  }

  pushHistory();
  const nextIds = ensureNextIds(sourceNode).map((nextId) =>
    nextId === oldTargetNodeId ? newTargetNodeId : nextId
  );
  sourceNode.nextIds = Array.from(new Set(nextIds));
  state.selectedNodeId = sourceNodeId;
  fillSceneForm(getSelectedNode());
  rerenderAll();
}

function deleteEdge(sourceNodeId, targetNodeId) {
  const sourceNode = getNodeById(sourceNodeId);
  if (!sourceNode) {
    return;
  }

  pushHistory();
  sourceNode.nextIds = ensureNextIds(sourceNode).filter((nextId) => nextId !== targetNodeId);
  rerenderAll();
}

function connectNodes(sourceNodeId, targetNodeId) {
  const sourceNode = getNodeById(sourceNodeId);
  if (!sourceNode) {
    rerenderAll();
    return;
  }

  pushHistory();
  const nextIds = ensureNextIds(sourceNode);
  if (!nextIds.includes(targetNodeId)) {
    sourceNode.nextIds = [...nextIds, targetNodeId];
  }
  state.selectedNodeId = sourceNodeId;
  fillSceneForm(getSelectedNode());
  rerenderAll();
}

function getCardAtPoint(clientX, clientY) {
  return document.elementsFromPoint(clientX, clientY).find((element) =>
    element.classList?.contains("scene-card")
  ) || null;
}

function enableDragging(card, node) {
  let isDragging = false;
  let startPointerX = 0;
  let startPointerY = 0;
  let startNodeX = 0;
  let startNodeY = 0;
  let dragSnapshot = null;

  card.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    if (event.target.closest("button, input, textarea")) {
      return;
    }

    isDragging = false;
    startPointerX = event.clientX;
    startPointerY = event.clientY;
    startNodeX = node.x;
    startNodeY = node.y;
    dragSnapshot = snapshotState();
    card.setPointerCapture(event.pointerId);

    const onPointerMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startPointerX;
      const deltaY = moveEvent.clientY - startPointerY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        isDragging = true;
      }

      if (!isDragging) {
        return;
      }

      node.x = Math.max(20, Math.round(startNodeX + deltaX));
      node.y = Math.max(20, Math.round(startNodeY + deltaY));
      card.style.left = `${node.x}px`;
      card.style.top = `${node.y}px`;
      renderEdges();

      if (state.selectedNodeId === node.key) {
        fillSceneForm(node);
      }
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (!isDragging) {
        const now = Date.now();
        const lastClick = state.lastCardClick;
        const isDoubleClick =
          lastClick &&
          lastClick.nodeId === node.key &&
          now - lastClick.timestamp < 320;

        state.lastCardClick = {
          nodeId: node.key,
          timestamp: now,
        };

        selectNode(node.key);

        if (isDoubleClick) {
          openScenePreview(node.key);
        }
        return;
      }

      state.history.push(dragSnapshot);
      if (state.history.length > 100) {
        state.history.shift();
      }
      renderMap();
      if (state.selectedNodeId === node.key) {
        fillSceneForm(node);
      }
      syncMapMetaInputs();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  });
}

function renderPreview() {
  const hasSelection = Boolean(getSelectedNode());
  elements.contextDeleteScene.disabled = !hasSelection;
  if (elements.contextToggleImportant) {
    elements.contextToggleImportant.disabled = !hasSelection;
    const selectedNode = getSelectedNode();
    elements.contextToggleImportant.textContent = selectedNode?.important ? "중요 해제" : "중요";
  }
}

function openSceneContextMenu(clientX, clientY, nodeId) {
  state.contextMenuNodeId = nodeId;
  closeExportContextMenu();
  elements.sceneContextMenu.style.left = `${clientX}px`;
  elements.sceneContextMenu.style.top = `${clientY}px`;
  elements.sceneContextMenu.hidden = false;
  renderPreview();
}

function closeSceneContextMenu() {
  state.contextMenuNodeId = null;
  elements.sceneContextMenu.hidden = true;
}

function openExportContextMenu(clientX, clientY) {
  closeSceneContextMenu();
  elements.exportContextMenu.style.left = `${clientX}px`;
  elements.exportContextMenu.style.top = `${clientY}px`;
  elements.exportContextMenu.hidden = false;
}

function closeExportContextMenu() {
  elements.exportContextMenu.hidden = true;
}

function showSceneHoverTip(card) {
  if (!elements.sceneHoverTip) {
    return;
  }

  if (state.hoverTipTimeoutId) {
    clearTimeout(state.hoverTipTimeoutId);
  }

  const rect = card.getBoundingClientRect();
  elements.sceneHoverTip.style.left = `${Math.max(16, rect.left + rect.width / 2 - 130)}px`;
  elements.sceneHoverTip.style.top = `${Math.max(16, rect.top - 54)}px`;
  elements.sceneHoverTip.hidden = false;

  state.hoverTipTimeoutId = window.setTimeout(() => {
    hideSceneHoverTip();
  }, 3000);
}

function hideSceneHoverTip() {
  if (!elements.sceneHoverTip) {
    return;
  }

  if (state.hoverTipTimeoutId) {
    clearTimeout(state.hoverTipTimeoutId);
    state.hoverTipTimeoutId = null;
  }

  elements.sceneHoverTip.hidden = true;
}

function showExportHoverTip() {
  if (!elements.exportHoverTip) {
    return;
  }

  const rect = elements.exportBtn.getBoundingClientRect();
  elements.exportHoverTip.style.left = `${Math.max(16, rect.left + rect.width / 2 - 36)}px`;
  elements.exportHoverTip.style.top = `${Math.max(16, rect.top - 44)}px`;
  elements.exportHoverTip.hidden = false;
}

function hideExportHoverTip() {
  if (!elements.exportHoverTip) {
    return;
  }

  elements.exportHoverTip.hidden = true;
}

function renderScenePreview() {
  const previewNode = state.previewNodeId ? getNodeById(state.previewNodeId) : null;
  if (!previewNode) {
    elements.scenePreviewOverlay.hidden = true;
    return;
  }

  elements.scenePreviewId.textContent = previewNode.sceneId || "";
  elements.scenePreviewTitleInput.value = previewNode.title || "";
  elements.scenePreviewSummaryInput.value = previewNode.summary || "";
  elements.scenePreviewDetailInput.value = previewNode.detail || "";
  elements.scenePreviewOverlay.hidden = false;
}

function createPreviewEditorSnapshot(input) {
  return {
    value: input.value,
    selectionStart: input.selectionStart ?? input.value.length,
    selectionEnd: input.selectionEnd ?? input.value.length,
  };
}

function getPreviewEditorFieldState(input) {
  if (!input?.id) {
    return null;
  }

  if (!state.previewEditor.fields[input.id]) {
    state.previewEditor.fields[input.id] = {
      history: [],
      index: -1,
      composing: false,
      pendingTabAfterComposition: false,
      suppressHistory: false,
    };
  }

  return state.previewEditor.fields[input.id];
}

function resetScenePreviewEditorHistory() {
  const inputs = [
    elements.scenePreviewTitleInput,
    elements.scenePreviewSummaryInput,
    elements.scenePreviewDetailInput,
  ].filter(Boolean);

  state.previewEditor.activeFieldKey = null;
  state.previewEditor.fields = {};

  inputs.forEach((input) => {
    const fieldState = getPreviewEditorFieldState(input);
    fieldState.history = [createPreviewEditorSnapshot(input)];
    fieldState.index = 0;
    fieldState.composing = false;
    fieldState.pendingTabAfterComposition = false;
    fieldState.suppressHistory = false;
  });
}

function recordScenePreviewFieldHistory(input, { replaceCurrent = false } = {}) {
  const fieldState = getPreviewEditorFieldState(input);
  if (!fieldState || fieldState.suppressHistory) {
    return;
  }

  const snapshot = createPreviewEditorSnapshot(input);
  const currentSnapshot = fieldState.history[fieldState.index];

  if (
    currentSnapshot &&
    currentSnapshot.value === snapshot.value &&
    currentSnapshot.selectionStart === snapshot.selectionStart &&
    currentSnapshot.selectionEnd === snapshot.selectionEnd
  ) {
    return;
  }

  if (replaceCurrent && fieldState.index >= 0) {
    fieldState.history[fieldState.index] = snapshot;
    return;
  }

  fieldState.history = fieldState.history.slice(0, fieldState.index + 1);
  fieldState.history.push(snapshot);
  if (fieldState.history.length > PREVIEW_EDITOR_HISTORY_LIMIT) {
    fieldState.history.shift();
  } else {
    fieldState.index += 1;
  }
  fieldState.index = fieldState.history.length - 1;
}

function applyScenePreviewFieldSnapshot(input, snapshot) {
  const fieldState = getPreviewEditorFieldState(input);
  if (!fieldState || !snapshot) {
    return;
  }

  fieldState.suppressHistory = true;
  input.value = snapshot.value;
  input.focus();
  const start = Math.min(snapshot.selectionStart ?? input.value.length, input.value.length);
  const end = Math.min(snapshot.selectionEnd ?? input.value.length, input.value.length);
  input.setSelectionRange(start, end);
  fieldState.suppressHistory = false;
}

function handleScenePreviewFieldFocus(event) {
  if (event.currentTarget?.id) {
    state.previewEditor.activeFieldKey = event.currentTarget.id;
  }
}

function handleScenePreviewFieldInput(event) {
  const input = event.currentTarget;
  const fieldState = getPreviewEditorFieldState(input);
  if (!fieldState || fieldState.composing || fieldState.suppressHistory) {
    return;
  }

  recordScenePreviewFieldHistory(input);
}

function handleScenePreviewCompositionStart(event) {
  const fieldState = getPreviewEditorFieldState(event.currentTarget);
  if (!fieldState) {
    return;
  }

  fieldState.composing = true;
  fieldState.pendingTabAfterComposition = false;
}

function handleScenePreviewCompositionEnd(event) {
  const input = event.currentTarget;
  const fieldState = getPreviewEditorFieldState(input);
  if (!fieldState) {
    return;
  }

  fieldState.composing = false;
  recordScenePreviewFieldHistory(input);

  if (!fieldState.pendingTabAfterComposition) {
    return;
  }

  fieldState.pendingTabAfterComposition = false;
  window.requestAnimationFrame(() => {
    insertTabIndent(input);
  });
}

function openScenePreview(nodeId) {
  state.previewNodeId = nodeId;
  renderScenePreview();
  resetScenePreviewEditorHistory();
}

function closeScenePreview() {
  state.previewNodeId = null;
  renderScenePreview();
}

function saveScenePreview() {
  const previewNode = state.previewNodeId ? getNodeById(state.previewNodeId) : null;
  if (!previewNode) {
    return;
  }

  pushHistory();
  previewNode.title = normalizeTitle(elements.scenePreviewTitleInput.value) || "씬의 정보";
  previewNode.summary = normalizeSummary(elements.scenePreviewSummaryInput.value);
  previewNode.detail = elements.scenePreviewDetailInput.value.trim();

  if (state.selectedNodeId === previewNode.key) {
    fillSceneForm(previewNode);
  }

  rerenderAll();
}

function getScenePreviewFocusableElements() {
  return [
    elements.scenePreviewTitleInput,
    elements.scenePreviewSummaryInput,
    elements.scenePreviewDetailInput,
    elements.scenePreviewSave,
    elements.scenePreviewUndo,
    elements.scenePreviewRedo,
    elements.scenePreviewClose,
  ].filter(Boolean);
}

function moveScenePreviewFocus(direction = 1) {
  const focusable = getScenePreviewFocusableElements();
  if (focusable.length === 0) {
    return;
  }

  const activeIndex = focusable.indexOf(document.activeElement);
  const currentIndex = activeIndex >= 0 ? activeIndex : 0;
  const nextIndex = (currentIndex + direction + focusable.length) % focusable.length;
  focusable[nextIndex].focus();
}

function insertTabIndent(textarea) {
  const fieldState = getPreviewEditorFieldState(textarea);
  if (!textarea || (fieldState && fieldState.composing)) {
    return;
  }
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? start;
  textarea.setRangeText("\t", start, end, "end");
  recordScenePreviewFieldHistory(textarea);
}

function handleScenePreviewTextareaKeydown(event) {
  if (event.key === "Tab" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    const fieldState = getPreviewEditorFieldState(event.currentTarget);
    if (event.isComposing || fieldState?.composing) {
      if (fieldState) {
        fieldState.pendingTabAfterComposition = true;
      }
      return;
    }
    insertTabIndent(event.currentTarget);
    return;
  }

  if (event.key === "Tab" && event.ctrlKey) {
    event.preventDefault();
    moveScenePreviewFocus(event.shiftKey ? -1 : 1);
  }
}

function handleScenePreviewFieldNavigation(event) {
  if (event.key === "Tab" && event.ctrlKey) {
    event.preventDefault();
    moveScenePreviewFocus(event.shiftKey ? -1 : 1);
  }
}

function getActiveScenePreviewInput() {
  const active = document.activeElement;
  if (active && active.closest(".scene-preview-card") && /^(INPUT|TEXTAREA)$/i.test(active.tagName)) {
    return active;
  }

  if (state.previewEditor.activeFieldKey) {
    return document.getElementById(state.previewEditor.activeFieldKey);
  }

  return elements.scenePreviewDetailInput;
}

function undoScenePreviewInput() {
  const target = getActiveScenePreviewInput();
  const fieldState = getPreviewEditorFieldState(target);
  if (!target || !fieldState) {
    undoLastAction();
    return;
  }

  if (fieldState.index <= 0) {
    undoLastAction();
    return;
  }

  fieldState.index -= 1;
  applyScenePreviewFieldSnapshot(target, fieldState.history[fieldState.index]);
}

function redoScenePreviewInput() {
  const target = getActiveScenePreviewInput();
  const fieldState = getPreviewEditorFieldState(target);
  if (!target || !fieldState) {
    redoLastAction();
    return;
  }

  if (fieldState.index >= fieldState.history.length - 1) {
    redoLastAction();
    return;
  }

  fieldState.index += 1;
  applyScenePreviewFieldSnapshot(target, fieldState.history[fieldState.index]);
}

function fillSceneForm() {}

function selectNode(nodeId) {
  if (state.editingSceneIdNodeId && state.editingSceneIdNodeId !== nodeId) {
    closeSceneIdEditor();
  }
  if (state.selectedNodeId && state.selectedNodeId !== nodeId) {
    state.lastSelectedNodeId = state.selectedNodeId;
  }
  state.selectedNodeId = nodeId;
  hideSceneHoverTip();
  closeSceneContextMenu();
  closeExportContextMenu();
  syncMapMetaInputs();
  renderMap();
  renderPreview();
}

function rerenderAll() {
  hideSceneHoverTip();
  closeSceneContextMenu();
  closeExportContextMenu();
  syncMapMetaInputs();
  renderMap();
  renderPreview();
  renderScenePreview();
}

function splitSceneTitle(title) {
  const match = String(title || "").match(/^(\d+)([A-Z]?)[.\-]?\s*(.*)$/);
  if (!match) {
    return { number: null, suffix: "", rest: String(title || "").trim() };
  }

  return {
    number: Number(match[1]),
    suffix: match[2] || "",
    rest: (match[3] || "").trim(),
  };
}

function sceneTitleRest(node, fallback) {
  const parsed = splitSceneTitle(node?.title);
  return parsed.rest || fallback;
}

function splitSceneId(sceneId) {
  const match = String(sceneId || "").trim().match(/^scene-(\d+)([A-Z]?)$/i);
  if (!match) {
    return { number: null, suffix: "" };
  }

  return {
    number: Number(match[1]),
    suffix: (match[2] || "").toUpperCase(),
  };
}

function branchSuffix(index) {
  return String.fromCharCode(65 + index);
}

function getNodeById(nodeId) {
  return state.map.nodes.find((node) => node.key === nodeId) || null;
}

function getParentNodes(nodeId) {
  return state.map.nodes.filter((node) => ensureNextIds(node).includes(nodeId));
}

function getBranchGroupByNodeId(nodeId) {
  const node = getNodeById(nodeId);
  if (!node) {
    return null;
  }

  const directChildren = ensureNextIds(node).map(getNodeById).filter(Boolean);
  if (directChildren.length > 1) {
    return { parentNode: node, branchNodes: directChildren };
  }

  const parentWithBranches = getParentNodes(nodeId).find(
    (parentNode) => ensureNextIds(parentNode).length > 1
  );
  if (!parentWithBranches) {
    return null;
  }

  return {
    parentNode: parentWithBranches,
    branchNodes: ensureNextIds(parentWithBranches).map(getNodeById).filter(Boolean),
  };
}

function normalizeBranchChildren(parentNode) {
  if (!parentNode) {
    return;
  }

  const childNodes = ensureNextIds(parentNode).map(getNodeById).filter(Boolean);
  if (childNodes.length === 0) {
    return;
  }

  const parentInfo = splitSceneTitle(parentNode.title);
  const parentSceneInfo = splitSceneId(parentNode.sceneId);
  const branchBaseNumber = (parentSceneInfo.number || parentInfo.number || 0) + 1;

  if (childNodes.length === 1) {
    const onlyChild = childNodes[0];
    const rest = sceneTitleRest(onlyChild, "씬의 정보");
    onlyChild.sceneId = `scene-${branchBaseNumber}`;
    onlyChild.title = normalizeTitle(rest) || "씬의 정보";
    delete onlyChild.branchParentId;
    delete onlyChild.branchBaseNumber;
    return;
  }

  childNodes.forEach((childNode, index) => {
    const rest = sceneTitleRest(childNode, "씬의 정보");
    childNode.sceneId = `scene-${branchBaseNumber}${branchSuffix(index)}`;
    childNode.title = normalizeTitle(rest) || "씬의 정보";
    childNode.branchParentId = parentNode.key;
    childNode.branchBaseNumber = branchBaseNumber;
  });
}

function findBranchLeaf(startNodeId, groupParentId) {
  let current = getNodeById(startNodeId);
  const visited = new Set();

  while (current && !visited.has(current.key)) {
    visited.add(current.key);
    const nextIds = ensureNextIds(current);
    if (nextIds.length !== 1) {
      return current;
    }

    const nextNode = getNodeById(nextIds[0]);
    if (!nextNode) {
      return current;
    }

    const parentCount = getParentNodes(nextNode.key).length;
    if (parentCount > 1 || nextNode.key === groupParentId) {
      return current;
    }

    current = nextNode;
  }

  return current;
}

function addSceneFromParent(parentId, { branch = false } = {}) {
  pushHistory();
  closeSceneIdEditor();
  state.selectedNodeId = parentId || null;
  const index = state.map.nodes.length + 1;
  const parentNode = getSelectedNode();
  const baseX = parentNode ? parentNode.x + CARD_WIDTH + NEW_SCENE_GAP : 100 + ((index - 1) % 4) * 280;
  const baseY = parentNode
    ? parentNode.y
    : 300 + Math.floor((index - 1) / 4) * 220;
  const parentSceneInfo = splitSceneId(parentNode?.sceneId);
  const nextSceneIdNumber = parentNode ? (parentSceneInfo.number || index - 1) + 1 : index;
  const node = {
    key: createNodeKey(),
    sceneId: `scene-${nextSceneIdNumber}`,
    title: "씬의 정보",
    summary: "이 장면의 짧은 요약을 적어주세요.",
    detail: "이 장면에서 실제로 일어나는 일을 자세히 적어주세요.",
    x: baseX,
    y: baseY,
    nextIds: [],
  };
  state.map.nodes.push(node);

  if (parentNode) {
    const nextIds = ensureNextIds(parentNode);
    if (!nextIds.includes(node.key)) {
      parentNode.nextIds = [...nextIds, node.key];
    }
    normalizeBranchChildren(parentNode);
  }

  selectNode(node.key);
  return node;
}

function addScene({ branch = false } = {}) {
  addSceneFromParent(state.selectedNodeId, { branch });
}

function autoCreateMergeSceneFromNode(nodeId) {
  const branchGroup = getBranchGroupByNodeId(nodeId);
  if (!branchGroup) {
    alert("합류하려면 먼저 하나의 장면에서 두 갈래 이상으로 분기되어 있어야 합니다.");
    return;
  }

  normalizeBranchChildren(branchGroup.parentNode);

  const branchLeaves = branchGroup.branchNodes
    .map((branchNode) => findBranchLeaf(branchNode.key, branchGroup.parentNode.key))
    .filter(Boolean);

  if (branchLeaves.length < 2) {
    alert("합류할 분기 장면이 아직 충분하지 않습니다.");
    return;
  }

  const commonNextId = branchLeaves[0]?.nextIds?.[0];
  const allShareSameNext =
    commonNextId &&
    branchLeaves.every(
      (leafNode) => ensureNextIds(leafNode).length === 1 && ensureNextIds(leafNode)[0] === commonNextId
    );

  if (allShareSameNext) {
    selectNode(commonNextId);
    return;
  }

  const firstBranchInfo = splitSceneTitle(branchGroup.branchNodes[0].title);
  const firstBranchSceneInfo = splitSceneId(branchGroup.branchNodes[0].sceneId);
  const mergeNumber = (firstBranchInfo.number || 0) + 1;
  const mergeSceneIdNumber = (firstBranchSceneInfo.number || 0) + 1;
  const mergeX = Math.max(...branchLeaves.map((leafNode) => leafNode.x)) + 320;
  const mergeY = Math.round(
    branchLeaves.reduce((sum, leafNode) => sum + leafNode.y, 0) / branchLeaves.length
  );
  const mergeIndex = state.map.nodes.length + 1;
  const mergeNode = {
    key: createNodeKey(),
    sceneId: `scene-${mergeSceneIdNumber}`,
    title: "씬의 정보",
    summary: "이 장면에서 두 분기가 다시 합쳐집니다.",
    detail: "분기된 사건들이 이 장면에서 하나의 흐름으로 다시 모입니다.",
    x: mergeX,
    y: mergeY,
    nextIds: [],
  };
  pushHistory();
  state.map.nodes.push(mergeNode);

  branchLeaves.forEach((leafNode) => {
    const leafNextIds = ensureNextIds(leafNode);
    if (!leafNextIds.includes(mergeNode.key)) {
      leafNode.nextIds = [...leafNextIds, mergeNode.key];
    }
  });

  selectNode(mergeNode.key);
}

function deleteSelectedScene() {
  if (!state.selectedNodeId) {
    return;
  }

  pushHistory();
  const deletedNodeId = state.selectedNodeId;
  const parentNodes = getParentNodes(deletedNodeId);
  state.map.nodes = state.map.nodes.filter((node) => node.key !== state.selectedNodeId);
  state.map.nodes.forEach((node) => {
    node.nextIds = ensureNextIds(node).filter((nextId) => nextId !== state.selectedNodeId);
  });
  parentNodes.forEach((parentNode) => {
    normalizeBranchChildren(parentNode);
  });
  state.selectedNodeId = state.map.nodes[0]?.key || null;
  if (state.previewNodeId === deletedNodeId) {
    state.previewNodeId = null;
  }
  fillSceneForm(getSelectedNode());
  rerenderAll();
}

function toggleSelectedSceneImportant() {
  const node = getSelectedNode();
  if (!node) {
    return;
  }

  pushHistory();
  node.important = !node.important;
  rerenderAll();
}

function updateMapMeta() {
  state.map.title = elements.storyTitle.value;
  state.map.logline = fitLoglineToField(elements.storyLogline.value).trim();
  syncMapMetaInputs();
}

function exportMap() {
  const blob = new Blob([JSON.stringify(state.map, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(state.map.title || "story-map")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function compareSceneDocumentOrder(leftNode, rightNode) {
  const leftSceneInfo = splitSceneId(leftNode.sceneId);
  const rightSceneInfo = splitSceneId(rightNode.sceneId);
  const leftTitleInfo = splitSceneTitle(leftNode.title);
  const rightTitleInfo = splitSceneTitle(rightNode.title);
  const leftSceneNumber = leftSceneInfo.number ?? leftTitleInfo.number ?? Number.MAX_SAFE_INTEGER;
  const rightSceneNumber = rightSceneInfo.number ?? rightTitleInfo.number ?? Number.MAX_SAFE_INTEGER;

  if (leftSceneNumber !== rightSceneNumber) {
    return leftSceneNumber - rightSceneNumber;
  }

  const leftTitleNumber = leftTitleInfo.number ?? leftSceneNumber;
  const rightTitleNumber = rightTitleInfo.number ?? rightSceneNumber;
  if (leftTitleNumber !== rightTitleNumber) {
    return leftTitleNumber - rightTitleNumber;
  }

  const leftSuffix = leftTitleInfo.suffix || "";
  const rightSuffix = rightTitleInfo.suffix || "";
  if (leftSuffix !== rightSuffix) {
    return leftSuffix.localeCompare(rightSuffix, "ko");
  }

  if (leftNode.y !== rightNode.y) {
    return leftNode.y - rightNode.y;
  }

  if (leftNode.x !== rightNode.x) {
    return leftNode.x - rightNode.x;
  }

  return String(leftNode.title || "").localeCompare(String(rightNode.title || ""), "ko");
}

function renumberSceneIdsFromNode(nodeId, requestedSceneId) {
  const requestedInfo = splitSceneId(requestedSceneId);
  if (!requestedInfo.number) {
    return false;
  }

  const sortedNodes = [...state.map.nodes].sort(compareSceneDocumentOrder);
  const targetIndex = sortedNodes.findIndex((node) => node.key === nodeId);
  if (targetIndex === -1) {
    return false;
  }

  const targetInfo = splitSceneId(sortedNodes[targetIndex].sceneId);
  if (!targetInfo.number) {
    return false;
  }

  const originalBaseNumber = targetInfo.number;
  let groupStart = targetIndex;
  while (groupStart > 0) {
    const previousInfo = splitSceneId(sortedNodes[groupStart - 1].sceneId);
    if (previousInfo.number !== originalBaseNumber) {
      break;
    }
    groupStart -= 1;
  }

  let groupEnd = targetIndex;
  while (groupEnd + 1 < sortedNodes.length) {
    const nextInfo = splitSceneId(sortedNodes[groupEnd + 1].sceneId);
    if (nextInfo.number !== originalBaseNumber) {
      break;
    }
    groupEnd += 1;
  }

  const assignedBaseNumber = requestedInfo.number;

  for (let index = groupStart; index <= groupEnd; index += 1) {
    const currentInfo = splitSceneId(sortedNodes[index].sceneId);
    const suffix = currentInfo.suffix || "";
    sortedNodes[index].sceneId = `scene-${assignedBaseNumber}${suffix}`;
  }

  let lastOriginalBaseNumber = originalBaseNumber;
  let currentAssignedBaseNumber = assignedBaseNumber;

  for (let index = groupEnd + 1; index < sortedNodes.length; index += 1) {
    const currentInfo = splitSceneId(sortedNodes[index].sceneId);
    if (!currentInfo.number) {
      continue;
    }

    if (currentInfo.number !== lastOriginalBaseNumber) {
      currentAssignedBaseNumber += 1;
      lastOriginalBaseNumber = currentInfo.number;
    }

    const suffix = currentInfo.suffix || "";
    sortedNodes[index].sceneId = `scene-${currentAssignedBaseNumber}${suffix}`;
  }

  return true;
}

function escapeHtmlDocument(value) {
  return escapeHtml(String(value || "")).replace(/\n/g, "<br>");
}

function buildSceneConnectionLabel(node) {
  const connectedSceneIds = ensureNextIds(node)
    .map(getNodeById)
    .filter(Boolean)
    .sort(compareSceneDocumentOrder)
    .map((nextNode) => nextNode.sceneId || "")
    .filter(Boolean);

  if (connectedSceneIds.length === 0) {
    return "";
  }

  return connectedSceneIds.join(", ");
}

function buildDownloadDocumentHtml({ mode = "scenario" } = {}) {
  const sortedNodes = [...state.map.nodes].sort(compareSceneDocumentOrder);
  const documentTitle = state.map.title?.trim() || "스토리 맵";
  const sceneBlocks = sortedNodes.map((node) => {
    const sceneId = node.sceneId || "";
    const title = normalizeTitle(node.title) || "씬의 정보";
    const connectionLabel = buildSceneConnectionLabel(node);
    const isImportant = Boolean(node.important);
    const bodyText = mode === "scene-list"
      ? (normalizeSummary(node.summary) || "짧은 요약이 아직 없습니다.")
      : (String(node.detail || "").trim() || "상세 스토리가 아직 없습니다.");

    return `
      <section class="scene-block">
        <h2 class="scene-heading">
          <span class="scene-id">${escapeHtml(sceneId)}</span>
          ${isImportant ? '<span class="scene-important-mark">★</span>' : ""}
          <span class="scene-heading-title${isImportant ? " important" : ""}">${escapeHtml(title)}</span>
          ${connectionLabel ? `<span class="scene-connection"><span class="scene-connection-arrow">→</span><span class="scene-connection-targets">${escapeHtml(connectionLabel)}</span></span>` : ""}
        </h2>
        <p>${escapeHtmlDocument(bodyText)}</p>
      </section>
    `;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(documentTitle)}</title>
  <style>
    body {
      margin: 48px;
      color: #111111;
      font-family: "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
      line-height: 1.15;
    }
    .doc-title {
      margin: 0 0 18px;
      font-size: 26px;
      font-weight: 700;
      line-height: 1.15;
    }
    .scene-block {
      margin: 0 0 1.15em;
      page-break-inside: avoid;
    }
    .scene-heading {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin: 0 0 6px;
      font-size: 14pt;
      line-height: 1.15;
    }
    .scene-id {
      font-size: 10.5pt;
      font-weight: 600;
      color: #666666;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    .scene-heading-title {
      font-size: 14pt;
      font-weight: 700;
      color: #111111;
    }
    .scene-heading-title.important {
      color: #c62828;
    }
    .scene-important-mark {
      font-size: 12pt;
      font-weight: 800;
      color: #c62828;
      line-height: 1;
    }
    .scene-connection {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 10.5pt;
      font-weight: 600;
      color: #8f3d2e;
      white-space: nowrap;
    }
    .scene-connection-arrow {
      display: inline-block;
      font-size: 16px;
      font-weight: 800;
      line-height: 1;
      transform: scaleX(1.5) scaleY(1.3);
      transform-origin: left center;
    }
    .scene-connection-targets {
      white-space: nowrap;
    }
    p {
      margin: 0;
      line-height: 1.15;
      white-space: normal;
    }
  </style>
</head>
<body>
  <h1 class="doc-title">${escapeHtml(documentTitle)}</h1>
  ${sceneBlocks}
</body>
</html>`;
}

function buildMarkdownDocument() {
  const sortedNodes = [...state.map.nodes].sort(compareSceneDocumentOrder);
  const documentTitle = state.map.title?.trim() || "스토리 맵";
  const sceneBlocks = sortedNodes.map((node) => {
    const sceneId = node.sceneId || "";
    const title = normalizeTitle(node.title) || "씬의 정보";
    const connectionLabel = buildSceneConnectionLabel(node);
    const detail = String(node.detail || "").trim() || "상세 스토리가 아직 없습니다.";
    const importantPrefix = node.important ? "★ " : "";
    const heading = `## ${sceneId} ${importantPrefix}${title}${connectionLabel ? ` → ${connectionLabel}` : ""}`;

    return `${heading}\n\n${detail}`;
  }).join("\n\n");

  return `# ${documentTitle}\n\n${sceneBlocks}\n`;
}

function exportGoogleDocsDocument() {
  const html = buildDownloadDocumentHtml({ mode: "scenario" });
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(state.map.title || "story-map")}-scenario.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportSceneListDocument() {
  const html = buildDownloadDocumentHtml({ mode: "scene-list" });
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(state.map.title || "story-map")}-scene-list.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportMarkdownDocument() {
  const markdown = buildMarkdownDocument();
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(state.map.title || "story-map")}-scenario.md`;
  link.click();
  URL.revokeObjectURL(url);
}

function validateMapData(data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.nodes)) {
    throw new Error("올바른 스토리 맵 JSON 형식이 아닙니다.");
  }

  const keyMap = new Map();

  data.nodes = data.nodes.map((node, index) => {
    const key = node.key || createNodeKey();
    if (node.key) {
      keyMap.set(node.key, key);
    }
    if (node.id) {
      keyMap.set(node.id, key);
    }

    return {
      key,
      sceneId: node.sceneId || node.id || `scene-${index + 1}`,
      title: normalizeTitle(node.title || `장면 ${index + 1}`),
      summary: node.summary || "",
      detail: node.detail || "",
      important: Boolean(node.important),
      x: Number(node.x ?? 80 + index * 240),
      y: Number(node.y ?? 80),
      nextIds: Array.isArray(node.nextIds) ? node.nextIds : [],
    };
  });

  data.nodes.forEach((node) => {
    node.nextIds = node.nextIds
      .map((nextId) => keyMap.get(nextId) || nextId)
      .filter(Boolean);
  });

  return {
    title: data.title || "",
    logline: data.logline || "",
    nodes: data.nodes,
  };
}

function loadSampleMap() {
  pushHistory();
  state.map = validateMapData(deepClone(SAMPLE_MAP));
  state.shareId = null;
  state.selectedNodeId = state.map.nodes[0]?.key || null;
  state.lastSelectedNodeId = null;
  state.mergeSourceNodeId = null;
  state.previewNodeId = null;
  state.future = [];
  fillSceneForm(getSelectedNode());
  rerenderAll();
}

async function importMap(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  pushHistory();
  state.map = validateMapData(data);
  state.shareId = null;
  state.selectedNodeId = state.map.nodes[0]?.key || null;
  state.lastSelectedNodeId = null;
  state.mergeSourceNodeId = null;
  state.previewNodeId = null;
  state.future = [];
  fillSceneForm(getSelectedNode());
  rerenderAll();
}

function resetMap() {
  pushHistory();
  state.map = deepClone(DEFAULT_MAP);
  state.shareId = null;
  state.selectedNodeId = null;
  state.lastSelectedNodeId = null;
  state.mergeSourceNodeId = null;
  state.future = [];
  fillSceneForm(null);
  rerenderAll();
}

async function saveMapOnline() {
  if (!isWebSaveAvailable()) {
    alert("웹 저장은 서버로 실행한 스토리맵에서 사용할 수 있습니다.");
    return null;
  }

  setShareStatus("웹에 저장하는 중...", "pending");

  const response = await fetch(
    state.shareId ? `${SHARE_API_BASE}/${encodeURIComponent(state.shareId)}` : SHARE_API_BASE,
    {
      method: state.shareId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shareId: state.shareId,
        map: state.map,
      }),
    }
  );

  if (!response.ok) {
    setShareStatus("웹 저장에 실패했습니다.", "error");
    throw new Error("웹 저장에 실패했습니다.");
  }

  const payload = await response.json();
  state.shareId = payload.shareId || state.shareId;
  const shareUrl = getShareUrl();
  if (shareUrl) {
    window.history.replaceState({}, "", shareUrl);
  }
  setShareStatus("웹 저장이 완료되었습니다.", "success");
  syncMapMetaInputs();
  return payload;
}

async function copyShareLink() {
  if (!isWebSaveAvailable()) {
    alert("공유 링크는 서버로 실행한 스토리맵에서 사용할 수 있습니다.");
    return;
  }

  if (!state.shareId) {
    await saveMapOnline();
  }

  const shareUrl = getShareUrl();
  if (!shareUrl) {
    alert("공유 링크를 만들지 못했습니다.");
    return;
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    setShareStatus("공유 링크를 복사했습니다.", "success");
  } catch (_error) {
    window.prompt("이 링크를 복사해 공유하세요.", shareUrl);
    setShareStatus("공유 링크를 확인해 복사하세요.", "default");
  }
}

async function loadSharedMapFromUrl() {
  if (!isWebSaveAvailable()) {
    return false;
  }

  const shareId = new URLSearchParams(window.location.search).get("share");
  if (!shareId) {
    return false;
  }

  setShareStatus("공유 맵을 불러오는 중...", "pending");
  const response = await fetch(`${SHARE_API_BASE}/${encodeURIComponent(shareId)}`);
  if (!response.ok) {
    setShareStatus("공유 맵을 찾지 못했습니다.", "error");
    throw new Error("공유 맵을 찾지 못했습니다.");
  }

  const payload = await response.json();
  state.map = validateMapData(payload.map || {});
  state.shareId = payload.shareId || shareId;
  state.selectedNodeId = state.map.nodes[0]?.key || null;
  state.lastSelectedNodeId = null;
  state.mergeSourceNodeId = null;
  state.previewNodeId = null;
  state.history = [];
  state.future = [];
  fillSceneForm(getSelectedNode());
  rerenderAll();
  setShareStatus("공유 맵을 불러왔습니다.", "success");
  return true;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

elements.storyTitle.addEventListener("input", updateMapMeta);
elements.storyLogline.addEventListener("input", updateMapMeta);
elements.emptyAddSceneBtn.addEventListener("click", () => {
  addSceneFromParent(null, { branch: false });
});
elements.saveOnlineBtn?.addEventListener("click", () => {
  saveMapOnline().catch((error) => {
    alert(error.message);
  });
});
elements.shareLinkBtn?.addEventListener("click", () => {
  copyShareLink().catch((error) => {
    alert(error.message);
  });
});
elements.exportBtn.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  event.stopPropagation();
  hideExportHoverTip();
  openExportContextMenu(event.clientX, event.clientY);
});
elements.exportBtn.addEventListener("click", (event) => {
  event.preventDefault();
});
elements.exportBtn.addEventListener("mouseenter", showExportHoverTip);
elements.exportBtn.addEventListener("mouseleave", hideExportHoverTip);
elements.exportBtn.addEventListener("blur", hideExportHoverTip);
elements.contextExportMap.addEventListener("click", () => {
  closeExportContextMenu();
  exportMap();
});
elements.contextExportSceneList.addEventListener("click", () => {
  closeExportContextMenu();
  exportSceneListDocument();
});
elements.contextExportScenario.addEventListener("click", () => {
  closeExportContextMenu();
  exportGoogleDocsDocument();
});
elements.contextExportMd.addEventListener("click", () => {
  closeExportContextMenu();
  exportMarkdownDocument();
});
elements.newMapBtn.addEventListener("click", resetMap);
elements.undoBtn.addEventListener("click", undoLastAction);
elements.redoBtn.addEventListener("click", redoLastAction);
elements.contextAddScene.addEventListener("click", () => {
  const parentId = state.contextMenuNodeId || state.selectedNodeId;
  closeSceneContextMenu();
  addSceneFromParent(parentId, { branch: false });
});
elements.contextDeleteScene.addEventListener("click", () => {
  closeSceneContextMenu();
  deleteSelectedScene();
});
elements.contextToggleImportant.addEventListener("click", () => {
  closeSceneContextMenu();
  toggleSelectedSceneImportant();
});
elements.importInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }
  importMap(file).catch((error) => {
    alert(error.message);
  });
  event.target.value = "";
});
elements.scenePreviewBackdrop.addEventListener("click", closeScenePreview);
elements.scenePreviewClose.addEventListener("click", closeScenePreview);
elements.scenePreviewSave.addEventListener("click", saveScenePreview);
elements.scenePreviewUndo.addEventListener("click", undoScenePreviewInput);
elements.scenePreviewRedo.addEventListener("click", redoScenePreviewInput);
elements.scenePreviewTitleInput.addEventListener("keydown", handleScenePreviewFieldNavigation);
elements.scenePreviewSummaryInput.addEventListener("keydown", handleScenePreviewTextareaKeydown);
elements.scenePreviewDetailInput.addEventListener("keydown", handleScenePreviewTextareaKeydown);
elements.scenePreviewTitleInput.addEventListener("focus", handleScenePreviewFieldFocus);
elements.scenePreviewSummaryInput.addEventListener("focus", handleScenePreviewFieldFocus);
elements.scenePreviewDetailInput.addEventListener("focus", handleScenePreviewFieldFocus);
elements.scenePreviewTitleInput.addEventListener("input", handleScenePreviewFieldInput);
elements.scenePreviewSummaryInput.addEventListener("input", handleScenePreviewFieldInput);
elements.scenePreviewDetailInput.addEventListener("input", handleScenePreviewFieldInput);
elements.scenePreviewTitleInput.addEventListener("compositionstart", handleScenePreviewCompositionStart);
elements.scenePreviewSummaryInput.addEventListener("compositionstart", handleScenePreviewCompositionStart);
elements.scenePreviewDetailInput.addEventListener("compositionstart", handleScenePreviewCompositionStart);
elements.scenePreviewTitleInput.addEventListener("compositionend", handleScenePreviewCompositionEnd);
elements.scenePreviewSummaryInput.addEventListener("compositionend", handleScenePreviewCompositionEnd);
elements.scenePreviewDetailInput.addEventListener("compositionend", handleScenePreviewCompositionEnd);
window.addEventListener("click", (event) => {
  if (!elements.sceneContextMenu.hidden && !event.target.closest("#scene-context-menu")) {
    closeSceneContextMenu();
  }
  if (!elements.exportContextMenu.hidden && !event.target.closest("#export-context-menu")) {
    closeExportContextMenu();
  }
  if (!event.target.closest(".scene-card")) {
    hideSceneHoverTip();
  }
  if (!event.target.closest("#export-btn")) {
    hideExportHoverTip();
  }
});
window.addEventListener("contextmenu", (event) => {
  if (!event.target.closest(".scene-card")) {
    closeSceneContextMenu();
  }
  if (!event.target.closest("#export-btn") && !event.target.closest("#export-context-menu")) {
    closeExportContextMenu();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.scenePreviewOverlay.hidden) {
    closeScenePreview();
  }
  if (event.key === "Escape" && !elements.sceneContextMenu.hidden) {
    closeSceneContextMenu();
  }
  if (event.key === "Escape" && !elements.exportContextMenu.hidden) {
    closeExportContextMenu();
  }
  if (event.key === "Escape") {
    hideExportHoverTip();
  }
});

async function initializeApp() {
  state.map = validateMapData(deepClone(SAMPLE_MAP));
  state.shareId = null;
  state.selectedNodeId = state.map.nodes[0]?.key || null;
  state.lastSelectedNodeId = null;
  state.mergeSourceNodeId = null;
  state.previewNodeId = null;
  state.history = [];
  state.future = [];
  fillSceneForm(getSelectedNode());
  rerenderAll();

  try {
    await loadSharedMapFromUrl();
  } catch (error) {
    alert(error.message);
  }
}

initializeApp();
