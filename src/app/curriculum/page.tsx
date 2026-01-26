"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import {
  fetchCurriculumTopics,
  createCurriculumTopic,
  updateCurriculumTopic,
  deleteCurriculumTopic,
  CurriculumTopic
} from "@/lib/supabase-helpers";

const levelColors: Record<string, string> = {
  a1: "bg-emerald-100 text-emerald-700 border-emerald-200",
  a2: "bg-blue-100 text-blue-700 border-blue-200",
  b1: "bg-indigo-100 text-indigo-700 border-indigo-200",
  b2: "bg-purple-100 text-purple-700 border-purple-200",
  c1: "bg-rose-100 text-rose-700 border-rose-200",
  c2: "bg-amber-100 text-amber-700 border-amber-200",
};

const categoryOptions = [
  "Grammar",
  "Vocabulary",
  "Speaking",
  "Listening",
  "Reading",
  "Writing",
  "Culture",
];

export default function CurriculumPage() {
  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<"a1" | "a2" | "b1" | "b2" | "c1" | "c2">("a1");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<CurriculumTopic | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<CurriculumTopic | null>(null);

  // Load topics from Supabase
  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    const data = await fetchCurriculumTopics();
    setTopics(data);
  };

  const filteredTopics = topics
    .filter((t) => t.level === selectedLevel)
    .sort((a, b) => a.order - b.order);

  const handleAddTopic = async (topic: Omit<CurriculumTopic, "id" | "created_at" | "updated_at">) => {
    try {
      await createCurriculumTopic(topic);
      await loadTopics();
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to create topic:', error);
      alert('Failed to create topic. Please try again.');
    }
  };

  const handleUpdateTopic = async (updatedTopic: CurriculumTopic) => {
    try {
      await updateCurriculumTopic(updatedTopic.id, {
        level: updatedTopic.level,
        category: updatedTopic.category,
        title: updatedTopic.title,
        description: updatedTopic.description,
        order: updatedTopic.order,
      });
      await loadTopics();
      setEditingTopic(null);
    } catch (error) {
      console.error('Failed to update topic:', error);
      alert('Failed to update topic. Please try again.');
    }
  };

  const handleDeleteTopic = (topic: CurriculumTopic) => {
    setTopicToDelete(topic);
  };

  const confirmDelete = async () => {
    if (topicToDelete) {
      try {
        await deleteCurriculumTopic(topicToDelete.id);
        await loadTopics();
        setTopicToDelete(null);
      } catch (error) {
        console.error('Failed to delete topic:', error);
        alert('Failed to delete topic. Please try again.');
      }
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 pb-16 md:pb-20 xl:pb-0">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-[#e2e8f0] px-3 md:px-6 py-4 md:py-5">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#1e293b] tracking-tight truncate">
                  Curriculum
                </h2>
                <p className="text-[#64748b] text-xs md:text-sm mt-1 hidden sm:block">
                  Organize learning topics across proficiency levels
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#00132c] hover:bg-[#0f2545] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Add Topic</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Level Tabs */}
        <div className="flex-shrink-0 bg-white border-b border-[#e2e8f0] px-3 md:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {(["a1", "a2", "b1", "b2", "c1"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-4 md:px-6 py-3 text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedLevel === level
                      ? "text-indigo-600 border-b-2 border-indigo-600"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Topics List */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <div className="max-w-7xl mx-auto">
            {filteredTopics.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl text-slate-400">
                    menu_book
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#1e293b] mb-2">No topics yet</h3>
                <p className="text-slate-500 text-sm">
                  Add topics to organize your {selectedLevel.toUpperCase()} curriculum
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                {filteredTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="bg-white rounded-lg border border-slate-200 p-4 md:p-5 hover:border-indigo-300 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${
                              levelColors[topic.level]
                            }`}
                          >
                            {topic.level.toUpperCase()}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                            {topic.category}
                          </span>
                        </div>
                        <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1">
                          {topic.title}
                        </h3>
                        <p className="text-sm text-slate-600">{topic.description}</p>
                      </div>

                      <div className="flex items-center gap-1 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => setEditingTopic(topic)}
                          className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px] text-slate-600">
                            edit
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeleteTopic(topic)}
                          className="p-1.5 hover:bg-red-50 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px] text-red-600">
                            delete
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="material-symbols-outlined text-[16px]">
                        format_list_numbered
                      </span>
                      <span>Order: {topic.order}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Topic Modal */}
      {(showAddModal || editingTopic) && (
        <TopicModal
          topic={editingTopic}
          currentLevel={selectedLevel}
          onSave={editingTopic ? handleUpdateTopic : handleAddTopic}
          onClose={() => {
            setShowAddModal(false);
            setEditingTopic(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {topicToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-[28px]">
                  delete
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Delete Topic
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Are you sure you want to delete <strong>{topicToDelete.title}</strong>? This action cannot be undone.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setTopicToDelete(null)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Topic Modal Component
function TopicModal({
  topic,
  currentLevel,
  onSave,
  onClose,
}: {
  topic: CurriculumTopic | null;
  currentLevel: "a1" | "a2" | "b1" | "b2" | "c1" | "c2";
  onSave: (topic: any) => void;
  onClose: () => void;
}) {
  const [level, setLevel] = useState<"a1" | "a2" | "b1" | "b2" | "c1" | "c2" | "c2">(
    topic?.level || currentLevel
  );
  const [category, setCategory] = useState(topic?.category || "");
  const [title, setTitle] = useState(topic?.title || "");
  const [description, setDescription] = useState(topic?.description || "");
  const [order, setOrder] = useState(topic?.order || 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!category || !title || !description) {
      alert("Please fill in all fields");
      return;
    }

    if (topic) {
      onSave({ ...topic, level, category, title, description, order });
    } else {
      onSave({ level, category, title, description, order });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <h3 className="text-base md:text-lg font-bold text-slate-900">
            {topic ? "Edit Topic" : "Add Topic"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-slate-600 text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-3 md:space-y-4">
          {/* Level Selection */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">
              Level
            </label>
            <div className="flex gap-2 flex-wrap">
              {(["a1", "a2", "b1", "b2", "c1"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    level === lvl
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {lvl.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-2.5 md:px-3 py-1.5 md:py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
              style={{ fontSize: "14px" }}
              required
            >
              <option value="" style={{ fontSize: "14px", padding: "8px" }}>
                Select a category...
              </option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat} style={{ fontSize: "14px", padding: "8px" }}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">
              Topic Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-2.5 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., Present Tense (Czas teraźniejszy)"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-2.5 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Brief description of the topic..."
              rows={3}
              required
            />
          </div>

          {/* Order */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">
              Order in Curriculum
            </label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="w-full px-2.5 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              min="1"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 md:gap-3 pt-3 md:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              {topic ? "Update Topic" : "Add Topic"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
