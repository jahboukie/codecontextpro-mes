"""
LangChain Integration with CodeContextPro Memory
This shows how to integrate ANY LLM with persistent memory using LangChain
"""

import requests
import json
from typing import List, Dict, Any, Optional
from langchain.memory.chat_memory import BaseChatMemory
from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langchain.llms.base import LLM
from langchain.chat_models.base import BaseChatModel

class CodeContextProMemory(BaseChatMemory):
    """
    LangChain Memory class that uses CodeContextPro API for persistence
    """
    
    def __init__(self, api_url: str = "http://localhost:3000", context: str = "langchain"):
        super().__init__()
        self.api_url = api_url
        self.context = context
        self.chat_memory = []
    
    def store_memory(self, content: str, context: str = None) -> bool:
        """Store information in CodeContextPro memory"""
        try:
            response = requests.post(
                f"{self.api_url}/api/memory/remember",
                json={
                    "content": content,
                    "context": context or self.context,
                    "type": "langchain-conversation"
                },
                headers={"Content-Type": "application/json"}
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Failed to store memory: {e}")
            return False
    
    def recall_memory(self, query: str, limit: int = 5) -> List[Dict]:
        """Recall relevant memories from CodeContextPro"""
        try:
            response = requests.get(
                f"{self.api_url}/api/memory/recall",
                params={"query": query, "limit": limit}
            )
            if response.status_code == 200:
                return response.json().get("memories", [])
            return []
        except Exception as e:
            print(f"Failed to recall memory: {e}")
            return []
    
    def add_user_message(self, message: str) -> None:
        """Add user message and store important info"""
        self.chat_memory.append(HumanMessage(content=message))
        
        # Store user message if it contains important information
        if self._is_important_info(message):
            self.store_memory(f"User said: {message}", "user-input")
    
    def add_ai_message(self, message: str) -> None:
        """Add AI message and store important info"""
        self.chat_memory.append(AIMessage(content=message))
        
        # Store AI insights or important responses
        if self._is_important_info(message):
            self.store_memory(f"AI provided: {message}", "ai-response")
    
    def _is_important_info(self, message: str) -> bool:
        """Simple heuristic to determine if message contains important info"""
        important_keywords = [
            "prefer", "like", "dislike", "always", "never", "remember",
            "important", "project", "requirement", "specification",
            "typescript", "python", "react", "vue", "angular"
        ]
        return any(keyword in message.lower() for keyword in important_keywords)
    
    def get_relevant_context(self, query: str) -> str:
        """Get relevant context from memory for current query"""
        memories = self.recall_memory(query)
        if not memories:
            return ""
        
        context = "\nRelevant information from previous conversations:\n"
        for i, memory in enumerate(memories, 1):
            context += f"{i}. {memory['content']} (from {memory['context']})\n"
        
        return context
    
    @property
    def messages(self) -> List[BaseMessage]:
        return self.chat_memory
    
    def clear(self) -> None:
        self.chat_memory = []


class MemoryEnhancedChatModel:
    """
    Wrapper that adds persistent memory to any LangChain chat model
    """
    
    def __init__(self, chat_model: BaseChatModel, memory_api_url: str = "http://localhost:3000"):
        self.chat_model = chat_model
        self.memory = CodeContextProMemory(memory_api_url)
    
    def chat_with_memory(self, user_message: str, system_prompt: str = "") -> str:
        """
        Enhanced chat that includes relevant memories in context
        """
        # Get relevant context from memory
        relevant_context = self.memory.get_relevant_context(user_message)
        
        # Build enhanced prompt
        enhanced_prompt = f"""{system_prompt}

{relevant_context}

User: {user_message}"""

        # Get response from chat model
        messages = [HumanMessage(content=enhanced_prompt)]
        response = self.chat_model(messages)

        # Store the conversation
        self.memory.add_user_message(user_message)
        self.memory.add_ai_message(response.content)

        return response.content


# Example usage with different LLM providers
def example_openai():
    """Example with OpenAI"""
    from langchain.chat_models import ChatOpenAI

    # Initialize chat model with memory
    chat_model = ChatOpenAI(model_name="gpt-4", openai_api_key="your-api-key")
    memory_chat = MemoryEnhancedChatModel(chat_model)

    # First conversation
    response1 = memory_chat.chat_with_memory(
        "Hi! I'm a Python developer who loves clean code and functional programming.",
        "You are a helpful coding assistant with persistent memory."
    )
    print("🤖 OpenAI Response:", response1)

    # Later conversation (will remember preferences)
    response2 = memory_chat.chat_with_memory(
        "Can you help me refactor this function to be more functional?",
        "You are a helpful coding assistant with persistent memory."
    )
    print("🤖 OpenAI Response:", response2)


def example_anthropic():
    """Example with Anthropic Claude"""
    from langchain.chat_models import ChatAnthropic

    # Initialize chat model with memory
    chat_model = ChatAnthropic(model="claude-3-sonnet-20240229", anthropic_api_key="your-api-key")
    memory_chat = MemoryEnhancedChatModel(chat_model)

    # Conversation with memory
    response = memory_chat.chat_with_memory(
        "I'm working on a React TypeScript project. What's the best way to handle state?",
        "You are a helpful coding assistant with persistent memory."
    )
    print("🤖 Claude Response:", response)


def example_local_llm():
    """Example with local LLM (Ollama, etc.)"""
    from langchain.llms import Ollama
    from langchain.chat_models import ChatOllama

    # Initialize local chat model with memory
    chat_model = ChatOllama(model="llama2")  # or any local model
    memory_chat = MemoryEnhancedChatModel(chat_model)

    # Conversation with memory
    response = memory_chat.chat_with_memory(
        "I prefer using Docker for all my projects. Can you help me containerize a Node.js app?",
        "You are a helpful coding assistant with persistent memory."
    )
    print("🤖 Local LLM Response:", response)


# Advanced: Custom memory tools for LangChain agents
from langchain.tools import BaseTool

class MemoryStoreTool(BaseTool):
    name = "store_memory"
    description = "Store important information for future reference"

    def __init__(self, api_url: str = "http://localhost:3000"):
        super().__init__()
        self.api_url = api_url

    def _run(self, content: str, context: str = "agent-stored") -> str:
        try:
            response = requests.post(
                f"{self.api_url}/api/memory/remember",
                json={"content": content, "context": context, "type": "agent-memory"},
                headers={"Content-Type": "application/json"}
            )
            if response.status_code == 200:
                return f"Successfully stored: {content}"
            return "Failed to store memory"
        except Exception as e:
            return f"Error storing memory: {e}"


class MemoryRecallTool(BaseTool):
    name = "recall_memory"
    description = "Search for relevant information from previous conversations"

    def __init__(self, api_url: str = "http://localhost:3000"):
        super().__init__()
        self.api_url = api_url

    def _run(self, query: str, limit: int = 5) -> str:
        try:
            response = requests.get(
                f"{self.api_url}/api/memory/recall",
                params={"query": query, "limit": limit}
            )
            if response.status_code == 200:
                memories = response.json().get("memories", [])
                if memories:
                    result = f"Found {len(memories)} relevant memories:\n"
                    for i, memory in enumerate(memories, 1):
                        result += f"{i}. {memory['content']} (from {memory['context']})\n"
                    return result
                return "No relevant memories found"
            return "Failed to search memory"
        except Exception as e:
            return f"Error searching memory: {e}"


# Example: LangChain agent with memory tools
def example_agent_with_memory():
    """Example of LangChain agent that can store and recall memories"""
    from langchain.agents import initialize_agent, AgentType
    from langchain.chat_models import ChatOpenAI

    # Initialize LLM and tools
    llm = ChatOpenAI(model_name="gpt-4", openai_api_key="your-api-key")
    tools = [MemoryStoreTool(), MemoryRecallTool()]

    # Create agent with memory tools
    agent = initialize_agent(
        tools=tools,
        llm=llm,
        agent=AgentType.OPENAI_FUNCTIONS,
        verbose=True
    )

    # Agent can now store and recall information automatically
    response = agent.run(
        "I'm working on a new project using Next.js and TypeScript. "
        "Please remember my tech stack preferences and help me set up the project structure."
    )
    print("🤖 Agent Response:", response)


if __name__ == "__main__":
    print("🚀 CodeContextPro LangChain Integration Examples")
    print("=" * 50)

    # Run examples (uncomment the ones you want to test)
    # example_openai()
    # example_anthropic()
    # example_local_llm()
    # example_agent_with_memory()

    print("\n✅ Integration examples ready!")
    print("💡 Make sure CodeContextPro memory server is running on http://localhost:3000")
