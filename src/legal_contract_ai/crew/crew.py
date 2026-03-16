from crewai import Agent, Crew, Process, Task, LLM
from crewai.project import CrewBase, agent, crew, task
from typing import List
from src.legal_contract_ai.api.schemas import RiskAssessment, RedlineSuggestion, RedlineList
import os
from dotenv import load_dotenv

load_dotenv()

import yaml

@CrewBase
class LegalContractCrew():
    """Legal Contract AI Analysis Crew"""
    
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'

    def __init__(self) -> None:
        self.fast_llm = LLM(
            model="gemini/gemini-2.5-flash", # Using the latest Gemini 2.5 Flash
            api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.1,
            max_tokens=2048
        )
        
        # Expert model for reasoning
        self.expert_llm = LLM(
            model="gemini/gemini-2.5-flash",
            api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.1,
            max_tokens=4096
        )

    @agent
    def structure_analyst(self) -> Agent:
        return Agent(
            config=self.agents_config['structure_analyst'],
            verbose=True,
            llm=self.fast_llm,
            allow_delegation=False
        )

    @agent
    def risk_analyst(self) -> Agent:
        return Agent(
            config=self.agents_config['risk_analyst'],
            verbose=True,
            llm=self.expert_llm,
            allow_delegation=False,
            max_rpm=5 # User requested RPM limit for Gemini
        )

    @agent
    def compliance_auditor(self) -> Agent:
        return Agent(
            config=self.agents_config['compliance_auditor'],
            verbose=True,
            llm=self.fast_llm,
            allow_delegation=False
        )

    @agent
    def plain_english_translator(self) -> Agent:
        return Agent(
            config=self.agents_config['plain_english_translator'],
            verbose=True,
            llm=self.expert_llm,
            allow_delegation=False,
            max_rpm=5
        )

    @agent
    def negotiation_advisor(self) -> Agent:
        return Agent(
            config=self.agents_config['negotiation_advisor'],
            verbose=True,
            llm=self.expert_llm,
            allow_delegation=False,
            max_rpm=5
        )

    @task
    def analyze_structure_task(self) -> Task:
        return Task(
            config=self.tasks_config['analyze_structure_task']
        )

    @task
    def explain_risks_task(self) -> Task:
        return Task(
            config=self.tasks_config['explain_risks_task'],
            output_json=RiskAssessment
        )

    @task
    def generate_summary_task(self) -> Task:
        return Task(
            config=self.tasks_config['generate_summary_task']
        )

    @task
    def suggest_redlines_task(self) -> Task:
        return Task(
            config=self.tasks_config['suggest_redlines_task'],
            output_json=RedlineList
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents, # type: ignore
            tasks=[
                self.analyze_structure_task(),
                self.explain_risks_task(),
                self.generate_summary_task(),
                self.suggest_redlines_task()
            ],
            process=Process.sequential,
            verbose=True,
            memory=False,
            max_rpm=2
        )
