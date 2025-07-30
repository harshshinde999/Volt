import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StepsList } from '../components/StepsList';
import { FileExplorer } from '../components/FileExplorer';
import { TabView } from '../components/TabView';
import { CodeEditor } from '../components/CodeEditor';
import { PreviewFrame } from '../components/PreviewFrame';
import { Step, FileItem, StepType } from '../types';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { parseXml } from '../steps';
import { useWebContainer } from '../hooks/useWebContainer';
import { Loader } from '../components/Loader';
import { motion } from "framer-motion";



export function Builder() {
  const location = useLocation();
  const { prompt } = location.state as { prompt: string };
  const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<{role: "user" | "assistant", content: string;}[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  const webcontainer = useWebContainer();

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  
  const [steps, setSteps] = useState<Step[]>([]);

  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;
    steps.filter(({status}) => status === "pending").map(step => {
      updateHappened = true;
      if (step?.type === StepType.CreateFile) {
        let parsedPath = step.path?.split("/") ?? []; // ["src", "components", "App.tsx"]
        let currentFileStructure = [...originalFiles]; // {}
        let finalAnswerRef = currentFileStructure;
  
        let currentFolder = ""
        while(parsedPath.length) {
          currentFolder =  `${currentFolder}/${parsedPath[0]}`;
          let currentFolderName = parsedPath[0];
          parsedPath = parsedPath.slice(1);
  
          if (!parsedPath.length) {
            // final file
            let file = currentFileStructure.find(x => x.path === currentFolder)
            if (!file) {
              currentFileStructure.push({
                name: currentFolderName,
                type: 'file',
                path: currentFolder,
                content: step.code
              })
            } else {
              file.content = step.code;
            }
          } else {
            /// in a folder
            let folder = currentFileStructure.find(x => x.path === currentFolder)
            if (!folder) {
              // create the folder
              currentFileStructure.push({
                name: currentFolderName,
                type: 'folder',
                path: currentFolder,
                children: []
              })
            }
  
            currentFileStructure = currentFileStructure.find(x => x.path === currentFolder)!.children!;
          }
        }
        originalFiles = finalAnswerRef;
      }

    })

    if (updateHappened) {

      setFiles(originalFiles)
      setSteps(steps => steps.map((s: Step) => {
        return {
          ...s,
          status: "completed"
        }
        
      }))
    }
    console.log(files);
  }, [steps, files]);

  useEffect(() => {
    const createMountStructure = (files: FileItem[]): Record<string, any> => {
      const mountStructure: Record<string, any> = {};
  
      const processFile = (file: FileItem, isRootFolder: boolean) => {  
        if (file.type === 'folder') {
          // For folders, create a directory entry
          mountStructure[file.name] = {
            directory: file.children ? 
              Object.fromEntries(
                file.children.map(child => [child.name, processFile(child, false)])
              ) 
              : {}
          };
        } else if (file.type === 'file') {
          if (isRootFolder) {
            mountStructure[file.name] = {
              file: {
                contents: file.content || ''
              }
            };
          } else {
            // For files, create a file entry with contents
            return {
              file: {
                contents: file.content || ''
              }
            };
          }
        }
  
        return mountStructure[file.name];
      };
  
      // Process each top-level file/folder
      files.forEach(file => processFile(file, true));
  
      return mountStructure;
    };
  
    const mountStructure = createMountStructure(files);
  
    // Mount the structure if WebContainer is available
    console.log(mountStructure);
    webcontainer?.mount(mountStructure);
  }, [files, webcontainer]);

  async function init() {
    const response = await axios.post(`${BACKEND_URL}/template`, {
      prompt: prompt.trim()
    });
    setTemplateSet(true);
    
    const {prompts, uiPrompts} = response.data;

    setSteps(parseXml(uiPrompts[0]).map((x: Step) => ({
      ...x,
      status: "pending"
    })));

    setLoading(true);
    const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
      messages: [...prompts, prompt].map(content => ({
        role: "user",
        content
      }))
    })

    setLoading(false);

    setSteps(s => [...s, ...parseXml(stepsResponse.data.response).map(x => ({
      ...x,
      status: "pending" as "pending"
    }))]);

    setLlmMessages([...prompts, prompt].map(content => ({
  role: "user",
  content
})));

setLlmMessages(x => [...x, {role: "assistant", content: stepsResponse.data.response}])


    setLlmMessages(x => [...x, {role: "assistant", content: stepsResponse.data.response}])
  }

  useEffect(() => {
    init();
  }, [])

// Ensure framer-motion is installed via: npm install framer-motion
const generatePlan = async () => {
  const newMessage = {
    role: "user" as const,
    content: userPrompt
  };

  setLoading(true);
  try {
    const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
      messages: [...llmMessages, newMessage].map(msg => ({
        role: msg.role === "assistant" ? "model" : msg.role,
        content: msg.content
      }))
    });

    setLlmMessages(x => [...x, newMessage]);
    setLlmMessages(x => [...x, {
      role: "assistant",
      content: stepsResponse.data.response
    }]);

    setSteps(s => [
      ...s,
      ...parseXml(stepsResponse.data.response).map(x => ({
        ...x,
        status: "pending" as const
      }))
    ]);
  } catch (err) {
    console.error(" Generation failed:", err);
  } finally {
    setLoading(false);
  }
};

return (
  <motion.div
    className="max-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col font-sans"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    {/* Header */}
    <header className="bg-gray-800 border-b border-gray-700 px-10 pb-1  shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
  <div className="space-y-1">
    <h1 className="text-3xl font-extrabold text-purple-400 tracking-tight">
      ~Volt~
    </h1>
    <p className="text-base text-gray-200 font-medium ">
      Search :
      <span className="ml-1 italic text-white">{ prompt}</span>
    </p>
  </div>
</header>


    {/* Main Layout */}
    <div className="flex-1 overflow-hidden">
      <div className="h-full grid grid-cols-4 gap-4 p-4 md:gap-6 md:p-6">

        {/* Sidebar */}
        <motion.div
        className="col-span-1 flex flex-col gap-3 h-[calc(100vh-8rem)] custom-scrollbar"
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Steps Section */}
        <div className="bg-gray-800 rounded-xl p-3 shadow-lg border border-gray-700 flex-1 flex flex-col overflow-hidden">
          <h2 className="text-lg font-semibold mb-2 text-gray-100">Steps</h2>
          <div className="overflow-y-auto  custom-scrollbar flex-1">
            <StepsList steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />
          </div>
        </div>

        {/* Custom Prompt Section */}
        <div className="bg-gray-800 rounded-xl p-2 mb-2 shadow-lg border border-gray-700">
          <h2 className="text-lg font-bold mb-2 text-blue-400">Custom Prompt</h2>
          {loading || !templateSet ? (
            <div className="flex justify-center items-center h-24">
              <Loader />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <textarea
                value={userPrompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    generatePlan();
                  }
                }}
                placeholder="Describe what you want to build..."
                className="bg-gray-700 text-white text-sm p-3 rounded-md resize-none border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-400 transition"
              />
              <button
                onClick={generatePlan}
                className="bg-gradient-to-tr from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-700 text-white font-semibold px-4 py-2 rounded-md transition duration-200 shadow-md hover:shadow-lg"
              >
                Generate Plan
              </button>
            </div>
          )}
        </div>
      </motion.div>


        {/* File Explorer */}
        <motion.div
        className="col-span-1 bg-gray-800 rounded-xl p-3  shadow-lg overflow-hidden max-h-[calc(100vh-8.5rem)] border border-gray-700"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-gray-800 pb-2">
          <h2 className="text-lg font-semibold text-gray-100">File Explorer</h2>
        </div>

        {/* Scrollable File List */}
        <div className="overflow-auto max-h-[calc(100vh-12.5rem)] pr-1 custom-scrollbar space-y-2">
          <FileExplorer files={files} onFileSelect={setSelectedFile} />
        </div>
      </motion.div>


            
        {/* Editor / Preview */}
        <motion.div
          className="col-span-2 bg-gray-900 rounded-xl shadow-xl p-4 h-[calc(100vh-8.5rem)] flex flex-col border border-gray-700"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <TabView activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Make this container flex-grow and scrollable */}
          <div className="flex-1 overflow-hidden mt-1 rounded-md border border-gray-700 bg-gray-800 flex flex-col">
            {activeTab === 'code' ? (
              <CodeEditor file={selectedFile} />
            ) : webcontainer ? (
              <div className="flex-1 overflow-auto custom-scrollbar px-4 py-2">
                <PreviewFrame
                  files={files
                    .filter(file => file.path && typeof file.content === 'string')
                    .map(file => ({
                      path: file.path,
                      content: file.content as string,
                    }))}
                  webContainer={webcontainer}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    repeatType: "reverse"
                  }}
                  className="text-purple-300 text-sm"
                >
                  Loading......
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
    
      <footer className="bg-gray-800 border-t border-gray-700 text-gray-400 text-sm px-6 py-1.5 text-center">
        <p>
          © {new Date().getFullYear()} <span className="text-purple-400 font-semibold">~Volt~</span>. All rights reserved.
        </p>
      
      </footer>
</motion.div>
);



}