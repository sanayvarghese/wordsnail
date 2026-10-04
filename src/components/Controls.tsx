"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faChevronDown, faAnglesDown, faTrashCan } from "@fortawesome/free-solid-svg-icons";

interface ControlsProps {
    trashCount: number;
    trashBouncing: boolean;
    showTrash?: boolean;
    onMoveLeft: () => void;
    onMoveRight: () => void;
    onSoftDrop: () => void;
    onHardDrop: () => void;
    onDiscard: () => void;
    trashRef?: React.RefObject<HTMLButtonElement | null>;
}

export const Controls: React.FC<ControlsProps> = ({
    trashCount,
    trashBouncing,
    showTrash = true,
    onMoveLeft,
    onMoveRight,
    onSoftDrop,
    onHardDrop,
    onDiscard,
    trashRef
}) => {
    return (
        <div className="controls-wrapper">
            <div className="controls-clusters">
                {/* Movement Controls (D-pad cluster) */}
                <div className="ctrl-group ctrl-group-nav">
                    <button className="btn-ctrl btn-arrow" onClick={onMoveLeft} title="Move Left (←)" id="btn-ctrl-left">
                        <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    <button className="btn-ctrl btn-arrow btn-soft-drop" onClick={onSoftDrop} title="Step Down 1 Row (↓)" id="btn-ctrl-down">
                        <FontAwesomeIcon icon={faChevronDown} />
                    </button>
                    <button className="btn-ctrl btn-arrow" onClick={onMoveRight} title="Move Right (→)" id="btn-ctrl-right">
                        <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                </div>

                <div className="ctrl-separator" />

                {/* Action Controls (Drop & Trash cluster) */}
                <div className="ctrl-group ctrl-group-actions">
                    <button className="btn-ctrl btn-drop" onClick={onHardDrop} title="Hard Drop to Bottom (Space)" id="btn-ctrl-drop">
                        <FontAwesomeIcon icon={faAnglesDown} />
                        <span className="btn-label">Drop</span>
                    </button>

                    {showTrash && (
                        <button
                            ref={trashRef}
                            className={`btn-ctrl btn-trash ${trashCount <= 0 ? "disabled" : ""} ${trashBouncing ? "bounce-pop" : ""}`}
                            onClick={onDiscard}
                            disabled={trashCount <= 0}
                            title="Discard Tile (T)"
                            id="btn-ctrl-trash"
                        >
                            <span className="trash-icon">
                                <FontAwesomeIcon icon={faTrashCan} />
                            </span>
                            <span className="trash-badge">{trashCount}</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="keyboard-hint">
                <b>&larr;</b> / <b>&rarr;</b> move &middot; <b>&darr;</b> step &middot; <b>SPACE</b> drop{showTrash ? <> &middot; <b>T</b> trash</> : null}
            </div>
        </div>
    );
};
