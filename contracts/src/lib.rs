#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Env, Symbol};

#[contract]
pub struct HelloWorld;

#[contractimpl]
impl HelloWorld {
    pub fn hello(_env: Env, to: Symbol) -> Symbol {
        to
    }

    pub fn greeting(_env: Env) -> Symbol {
        symbol_short!("Hello")
    }
}
