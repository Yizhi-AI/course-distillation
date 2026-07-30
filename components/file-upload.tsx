"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import {
  extensionOf,
  formatSize,
  MaterialFile,
  MaterialKind,
  MaterialRole,
} from "@/lib/materials";

export function FileUpload({
  kind,
  title,
  description,
  files,
  onAdd,
  onRemove,
  onRoleChange,
}: {
  kind: MaterialKind;
  title: string;
  description: string;
  files: MaterialFile[];
  onAdd: (files: FileList | File[], kind: MaterialKind) => Promise<void>;
  onRemove: (id: string) => void;
  onRoleChange: (id: string, role: MaterialRole) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void onAdd(event.target.files, kind);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) {
      void onAdd(event.dataTransfer.files, kind);
    }
  }

  return (
    <div className="upload-column">
      <div className="upload-heading">
        <div className="upload-icon" aria-hidden="true">
          {kind === "course" ? "课" : "补"}
        </div>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        multiple
        accept=".md,.txt,.json,.csv,.srt,.vtt"
        onChange={onInput}
      />
      <div
        className={`drop-zone ${dragging ? "is-dragging" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            inputRef.current?.click();
          }
        }}
        onDragEnter={() => setDragging(true)}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <strong>点击选择，或把文件拖到这里</strong>
        <span>可直接读取 MD · TXT · JSON · 字幕文件</span>
      </div>

      {files.length > 0 && (
        <ul className="file-list" aria-label={`${title}文件列表`}>
          {files.map((file) => (
            <li key={file.id}>
              <span className="file-type">{extensionOf(file.name)}</span>
              <span className="file-name" title={file.name}>
                {file.name}
              </span>
              {kind === "course" ? (
                <select
                  aria-label={`${file.name}的资料类型`}
                  value={file.role}
                  onChange={(event) =>
                    onRoleChange(file.id, event.target.value as MaterialRole)
                  }
                >
                  <option value="structure">课件/讲义</option>
                  <option value="transcript">逐字稿/字幕</option>
                </select>
              ) : (
                <span className="file-role">补充资料</span>
              )}
              <small>{formatSize(file.size)}</small>
              <button
                type="button"
                aria-label={`移除 ${file.name}`}
                onClick={() => onRemove(file.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
