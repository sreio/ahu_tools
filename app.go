package main

import (
	"context"
	"fmt"
)

type App struct {
	ctx     context.Context
	service *DecryptService
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	service, err := NewDecryptService()
	if err != nil {
		fmt.Printf("Failed to initialize service: %v\n", err)
	}
	a.service = service
}

func (a *App) GetVersion() string {
	return Version
}

func (a *App) GetAppName() string {
	return AppName
}

func (a *App) GetAuthor() string {
	return Author
}
